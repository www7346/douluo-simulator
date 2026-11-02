/** Wire schemas describe shape only. Game rules still validate meaning and execution. */
export type ModelJsonSchema=Record<string,any>;

export interface ModelShapeIssue {
 instancePath:string;keyword:string;submitted:unknown;
 reference:{instancePath:string;value:unknown};
}
const pointer=(key:string)=>key.replaceAll('~','~0').replaceAll('/','~1');
export function modelShapeIssues(value:unknown,schema:ModelJsonSchema,path=''):ModelShapeIssue[]{
 const issue=(keyword:string,submitted:unknown=value,at=path):ModelShapeIssue=>({instancePath:at,keyword,submitted:submitted??null,reference:{instancePath:path,value:structuredClone(schema)}});
 const matches=(type:string)=>type==='null'?value===null:type==='object'?!!value&&typeof value==='object'&&!Array.isArray(value):type==='array'?Array.isArray(value):type==='integer'?Number.isSafeInteger(value):typeof value===type;
 if(schema.type&&!(Array.isArray(schema.type)?schema.type:[schema.type]).some(matches))return [issue('type')];
 if(schema.enum&&!schema.enum.some((entry:unknown)=>entry===value))return [issue('enum')];
 if(schema.anyOf&&!schema.anyOf.some((alternative:ModelJsonSchema)=>modelShapeIssues(value,alternative,path).length===0))return [issue('anyOf')];
 const issues:ModelShapeIssue[]=[];
 if(typeof value==='number'){
  if(schema.minimum!==undefined&&value<schema.minimum)issues.push(issue('minimum'));
  if(schema.maximum!==undefined&&value>schema.maximum)issues.push(issue('maximum'));
 }
 if(typeof value==='string'){
  if(schema.minLength!==undefined&&value.length<schema.minLength)issues.push(issue('minLength'));
  if(schema.maxLength!==undefined&&value.length>schema.maxLength)issues.push(issue('maxLength'));
 }
 if(value&&typeof value==='object'&&!Array.isArray(value)){
  const record=value as Record<string,unknown>,properties=schema.properties??{};
  if(schema.additionalProperties===false)for(const key of Object.keys(record))if(!Object.hasOwn(properties,key))issues.push(issue('additional-property',record[key],path+'/'+pointer(key)));
  for(const key of schema.required??[])if(!Object.hasOwn(record,key))issues.push(issue('required',null,path+'/'+pointer(key)));
  for(const [key,field] of Object.entries(properties))if(Object.hasOwn(record,key))issues.push(...modelShapeIssues(record[key],field as ModelJsonSchema,path+'/'+pointer(key)));
 }
 if(Array.isArray(value)){
  if(schema.minItems!==undefined&&value.length<schema.minItems)issues.push(issue('minItems'));
  if(schema.maxItems!==undefined&&value.length>schema.maxItems)issues.push(issue('maxItems'));
  if(schema.items)for(const [index,item] of value.entries())issues.push(...modelShapeIssues(item,schema.items,path+'/'+index));
 }
 return issues;
}
