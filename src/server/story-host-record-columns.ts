/** Lossless, read-only prompt transport. Command and response values remain unchanged. */
const TRANSPORT_KEYS=['recordColumns','recordColumnFormat','readonlyLiterals','readonlyLiteralFormat','recordSharedFields','recordSharedFieldFormat','readonlyStructures','readonlyStructureFormat'];
const PROTECTED_KEYS=new Set(['$fact','$evidence','evidenceId','factPath','requestedFactPath','readingPaths','sourcePath','packageId','sourcePackageId','factsHash','unitId','marker','catalogDirectory','catalogProtocol','actionCatalog']);
const bytes=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value)).length;
const identifierKey=(key:string)=>key==='id'||key==='ids'||/(?:Id|ID)s?$/.test(key);
const protectedKey=(key:string)=>PROTECTED_KEYS.has(key)||identifierKey(key);

/** Executable references stay literal even when repeated in another reading or nested transport. */
function identifierLiterals(input:Record<string,any>):Set<string>{
 const identifiers=new Set<string>();
 const scan=(value:any,key=''):void=>{
  if(identifierKey(key))for(const id of Array.isArray(value)?value:[value])if(typeof id==='string')identifiers.add(id);
  if(!value||typeof value!=='object')return;
  if(!Array.isArray(value)&&TRANSPORT_KEYS.some(field=>Object.hasOwn(value,field)))value=expandHostRecordColumns(value);
  for(const [childKey,child]of Object.entries(value))scan(child,childKey);
 };
 scan(input);return identifiers;
}

/** References always point to an original complete subtree, never to another newly made reference. */
function shareReadonlyStructures(input:Record<string,any>):Record<string,any>{
 const counts=new Map<string,number>(),heads=new Set<string>();
 const allHeads=(value:any):void=>{if(!value||typeof value!=='object')return;if(Array.isArray(value)&&typeof value[0]==='string')heads.add(value[0]);for(const child of Object.values(value))allHeads(child);};allHeads(input);
 const scan=(value:any,key=''):void=>{
  if(!value||typeof value!=='object')return;
  if(Array.isArray(value)&&typeof value[0]==='string')heads.add(value[0]);
  if(protectedKey(key))return;
  const raw=JSON.stringify(value);if(bytes(value)>=40)counts.set(raw,(counts.get(raw)??0)+1);
  for(const [childKey,child]of Object.entries(value))scan(child,childKey);
 };
 scan(input);let prefix='@v';while([...heads].some(head=>head.startsWith(prefix)))prefix='@'+prefix;
 const readonlyStructures:Record<string,any>={},ids=new Map<string,string>();
 const replace=(value:any,key=''):any=>{
  if(protectedKey(key)||!value||typeof value!=='object')return value;
  const raw=JSON.stringify(value),count=counts.get(raw)??0,length=bytes(value);
  if(count*(length-10)-length-10>32){let id=ids.get(raw);if(!id){id=prefix+(ids.size+1);ids.set(raw,id);readonlyStructures[id]=value;}return [id];}
  return Array.isArray(value)?value.map(child=>replace(child)):Object.fromEntries(Object.entries(value).map(([childKey,child])=>[childKey,replace(child,childKey)]));
 };
 const result={...Object.fromEntries(Object.entries(input).map(([key,value])=>[key,replace(value,key)])),readonlyStructures,
  readonlyStructureFormat:`仅含${prefix}编号的一项数组，读取readonlyStructures中完整结构；展开后字段、顺序及原文均不变。命令须填写展开后的原值。`};
 return ids.size&&bytes(result)<bytes(input)?result:input;
}

export function compactHostRecordColumns(input:Record<string,any>):Record<string,any>{
 if(TRANSPORT_KEYS.some(key=>Object.hasOwn(input,key)))throw Error('主持资料只读传输保留字冲突');
 const source=JSON.parse(JSON.stringify(input)),identifiers=identifierLiterals(source),counts=new Map<string,number>(),heads=new Set<string>(),literalCounts=new Map<string,number>();
 const arrayHeads=(value:any):void=>{if(!value||typeof value!=='object')return;if(Array.isArray(value)&&typeof value[0]==='string')heads.add(value[0]);for(const child of Object.values(value))arrayHeads(child);};arrayHeads(source);
 const countLiterals=(value:any,key=''):void=>{if(protectedKey(key))return;if(typeof value==='string'){if(bytes(value)>=8&&!identifiers.has(value))literalCounts.set(value,(literalCounts.get(value)??0)+1);return;}if(value&&typeof value==='object')for(const [childKey,child]of Object.entries(value))countLiterals(child,childKey);};
 countLiterals(source);let literalPrefix='@s';while([...heads].some(head=>head.startsWith(literalPrefix)))literalPrefix='@'+literalPrefix;
 const readonlyLiterals:Record<string,string>={},literalKeys=new Map<string,string>();
 for(const [value,count]of literalCounts){const id=literalPrefix+(literalKeys.size+1),literalBytes=bytes(value),referenceBytes=bytes([id]);if(count*(literalBytes-referenceBytes)-literalBytes-id.length-4>16){literalKeys.set(value,id);readonlyLiterals[id]=value;}}
 const replaceLiterals=(value:any,key=''):any=>{if(protectedKey(key))return value;if(typeof value==='string')return literalKeys.has(value)?[literalKeys.get(value)]:value;if(Array.isArray(value))return value.map(child=>replaceLiterals(child));return value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([childKey,child])=>[childKey,replaceLiterals(child,childKey)])):value;};
 const prepared=replaceLiterals(source),records=new Map<string,Record<string,any>[]>();
 const scan=(value:any,key=''):void=>{
  if(protectedKey(key)||!value||typeof value!=='object')return;
  if(Array.isArray(value)){if(typeof value[0]==='string')heads.add(value[0]);}
  else{const signature=JSON.stringify(Object.keys(value));counts.set(signature,(counts.get(signature)??0)+1);const rows=records.get(signature)??[];rows.push(value);records.set(signature,rows);}
  for(const [childKey,child]of Object.entries(value))scan(child,childKey);
 };
 scan(prepared);let prefix='@r';while([...heads].some(head=>head.startsWith(prefix)))prefix='@'+prefix;
 const recordColumns:Record<string,string[]>={},types=new Map<string,string>(),commonByType:Record<string,Record<string,any>>={};
 for(const [signature,count]of counts){
  const columns:string[]=JSON.parse(signature);
  if(count*(bytes(columns)-12)-bytes(columns)>32){
   const id=prefix+(types.size+1);types.set(signature,id);recordColumns[id]=columns;
   const rows=records.get(signature)!,common:Record<string,any>={};
   for(const key of columns){const raw=JSON.stringify(rows[0][key]);if(rows.every(row=>JSON.stringify(row[key])===raw))common[key]=rows[0][key];}
   const keys=Object.keys(common),saving=count*keys.reduce((n,key)=>n+bytes(common[key])+1,0)-bytes(common)-id.length-4;
   if(keys.length&&saving>32)commonByType[id]=common;
  }
 }
 if(!types.size)return shareReadonlyStructures(source);
 const encode=(value:any,key=''):any=>{
  if(protectedKey(key)||!value||typeof value!=='object')return value;
  if(Array.isArray(value))return value.map(child=>encode(child));
  const id=types.get(JSON.stringify(Object.keys(value)));
  return id?[id,...Object.entries(value).flatMap(([childKey,child])=>Object.hasOwn(commonByType[id]??{},childKey)?[]:[encode(child,childKey)])]:Object.fromEntries(Object.entries(value).map(([childKey,child])=>[childKey,encode(child,childKey)]));
 };
 const recordSharedFields=Object.fromEntries(Object.entries(commonByType).map(([id,fields])=>[id,Object.fromEntries(recordColumns[id].flatMap((key,index)=>Object.hasOwn(fields,key)?[[String(index),encode(fields[key],key)]]:[]))]));
 // The full original column order remains in the table. Shared columns are skipped only on the wire.
 const result={...Object.fromEntries(Object.entries(prepared).map(([key,child])=>[key,encode(child,key)])),recordColumns,
  ...(literalKeys.size?{readonlyLiterals,readonlyLiteralFormat:`仅含${literalPrefix}编号的一项数组读取readonlyLiterals中的完整原文字面值；展开后按原字段/路径读取，不可在命令或引用返回中使用编号。`}:{}),
  ...(Object.keys(recordSharedFields).length?{recordSharedFields,recordSharedFieldFormat:'同类型记录的共同字段在recordSharedFields，数字键为recordColumns中从0开始的列序号；recordColumns保留完整原字段顺序，记录后续值依次对应未登记为共同字段的列。所有字段按原顺序恢复。'}:{}),
  recordColumnFormat:`首项为${prefix}编号的数组是完整对象记录，按recordColumns的有序字段名读取；若该类型有共同字段，先读取recordSharedFields，记录后续值仅对应其余列。其他数组仍为原列表。行动参数须填写展开后的原值。`};
 const compacted=shareReadonlyStructures(result);
 return bytes(compacted)<bytes(source)?compacted:source;
}

export function compactStoryPacketReadings(packet:Record<string,any>):Record<string,any>{
 const result={...packet,...(packet.writingFacts?{writingFacts:compactHostRecordColumns(packet.writingFacts)}:{}),
  ...(packet.writingUnits?{writingUnits:compactHostRecordColumns(packet.writingUnits)}:{}),
  ...(packet.commerceReadings?{commerceReadings:compactHostRecordColumns({items:packet.commerceReadings})}:{})};
 return packet.facts||packet.writingFacts?compactHostRecordColumns(result):result;
}
export function expandStoryPacketReadings(packet:Record<string,any>):Record<string,any>{
 const expanded=expandHostRecordColumns(packet);
 return {...expanded,...(expanded.facts?{facts:expandHostRecordColumns(expanded.facts)}:{}),
  ...(expanded.writingFacts?{writingFacts:expandHostRecordColumns(expanded.writingFacts)}:{}),
  ...(expanded.writingUnits?{writingUnits:expandHostRecordColumns(expanded.writingUnits)}:{}),
  ...(expanded.commerceReadings?{commerceReadings:expandHostRecordColumns(expanded.commerceReadings).items}:{})};
}

export function expandHostRecordColumns(input:Record<string,any>):Record<string,any>{
 const structures=input.readonlyStructures??{};
 const expandStructures=(value:any):any=>{
  if(!value||typeof value!=='object')return value;
  if(Array.isArray(value)&&value.length===1&&typeof value[0]==='string'&&Object.hasOwn(structures,value[0]))return structuredClone(structures[value[0]]);
  return Array.isArray(value)?value.map(expandStructures):Object.fromEntries(Object.entries(value).map(([key,child])=>[key,expandStructures(child)]));
 };
 const prepared=Object.fromEntries(Object.entries(input).filter(([key])=>!['readonlyStructures','readonlyStructureFormat'].includes(key)).map(([key,value])=>[key,expandStructures(value)]));
 const table=prepared.recordColumns,literals=prepared.readonlyLiterals??{},shared=prepared.recordSharedFields??{};if(!table)return structuredClone(prepared);
 const expand=(value:any):any=>{
  if(!value||typeof value!=='object')return value;
  if(Array.isArray(value)&&value.length===1&&typeof value[0]==='string'&&Object.hasOwn(literals,value[0]))return literals[value[0]];
  if(Array.isArray(value)&&typeof value[0]==='string'&&Object.hasOwn(table,value[0])){
   const columns=table[value[0]],common=shared[value[0]]??{};
   if(!Array.isArray(columns)||columns.some((key:any)=>typeof key!=='string')||new Set(columns).size!==columns.length||!common||typeof common!=='object'||Array.isArray(common)||Object.keys(common).some(key=>!/^\d+$/.test(key)||String(Number(key))!==key||Number(key)>=columns.length))throw Error('主持资料字段不匹配');
   if(value.length!==columns.filter((_:string,index:number)=>!Object.hasOwn(common,String(index))).length+1)throw Error('主持资料列数不匹配');
   let index=1;return Object.fromEntries(columns.map((key:string,columnIndex:number)=>[key,expand(Object.hasOwn(common,String(columnIndex))?common[String(columnIndex)]:value[index++])]));
  }
  return Array.isArray(value)?value.map(expand):Object.fromEntries(Object.entries(value).map(([key,child])=>[key,expand(child)]));
 };
 return Object.fromEntries(Object.entries(prepared).filter(([key])=>!TRANSPORT_KEYS.includes(key)).map(([key,child])=>[key,expand(child)]));
}
