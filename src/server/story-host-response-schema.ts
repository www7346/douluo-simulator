import type {ModelJsonSchema} from '../shared/model-json-schema';
import {STORY_OBJECT_TEXT_SCHEMAS} from '../shared/story-object-contract';

const supported=new Set(['type','description','properties','required','additionalProperties','items','enum','anyOf','minimum','maximum','minItems','maxItems','minLength','maxLength','uniqueItems']);
/** Strip catalogue annotations from the provider schema, never from a proposal. */
function wireSchema(value:any):ModelJsonSchema{
 return Object.fromEntries(Object.entries(value).filter(([key])=>supported.has(key)).map(([key,entry])=>[key,
  key==='properties'?Object.fromEntries(Object.entries(entry as any).map(([name,field])=>[name,wireSchema(field)])):
  key==='items'?wireSchema(entry):key==='anyOf'?(entry as any[]).map(wireSchema):entry]));
}
function parameterSchema(action:any,name:string):ModelJsonSchema{
 if(action.kind==='remember-object'&&STORY_OBJECT_TEXT_SCHEMAS[name])return STORY_OBJECT_TEXT_SCHEMAS[name];
 const object=action.objectParameters?.[name];
 if(object?.type||object?.anyOf)return wireSchema(object);
 const array=action.arrayParameters?.[name];
 if(array)return {type:'array',items:array.items==='string'?{type:'string'}:array.items&&typeof array.items==='object'&&(array.items.type||array.items.anyOf)?wireSchema(array.items):{},...Object.fromEntries(['minItems','maxItems','uniqueItems'].filter(key=>array[key]!==undefined).map(key=>[key,array[key]]))};
 if(object!==undefined||action.jsonStringParameters?.[name])return {type:name==='check'?['object','null']:'object'};
 if(action.integerParameters?.includes(name)||/Step$/.test(name))return {type:'integer',...(action.ranges?.[name]?{minimum:action.ranges[name][0],maximum:action.ranges[name][1]}:{})};
 if(action.booleanParameters?.includes(name))return {type:'boolean'};
 const options=action.valueOptions?.[name];
 if(Array.isArray(options)&&options.length){const values=options.map(v=>v&&typeof v==='object'?v.value:v);if(values.every(v=>['string','number','boolean'].includes(typeof v)))return {enum:values};}
 // Unspecified fields retain their existing rule validator. Guessing a string
 // here would reject valid objects/arrays used by other registered operations.
 return {};
}
export function storyHostResponseSchema(actions:readonly any[],groups:readonly string[],allowLookup:boolean):ModelJsonSchema{
 const variants=actions.map(action=>({type:'object',properties:{kind:{type:'string',enum:[action.kind]},...Object.fromEntries(action.parameters.filter((name:string)=>!['evidence','martialSoulDraft'].includes(name)).map((name:string)=>[name,parameterSchema(action,name)]))},required:['kind',...(action.allParametersRequired?action.parameters:action.requiredParameters??[])],additionalProperties:false}));
 const properties:Record<string,any>={
  channel:{type:'string',enum:['current','party']},
  segments:{type:'array',minItems:1,maxItems:12,items:{type:'object',properties:{source:{description:'默认选择本轮完整输入引用{input:true}，由代码保留全文；仅需限定来源范围或区分重复原文时选择逐字连续子句，所有片段仍须覆盖完整输入',anyOf:[{type:'object',properties:{input:{type:'boolean',enum:[true]}},required:['input'],additionalProperties:false},{type:'string'}]},task:{type:'string',enum:['query','communication','npc-choice','rule-action','player-choice','expression']},action:{anyOf:variants},when:{type:'object',properties:{step:{type:'integer',minimum:0},status:{type:'string'},outcome:{type:'string'},belief:{type:'string'},marketStatus:{type:'string'},agreementStatus:{type:'string',enum:['proposed','accepted','sourceUnavailable','active','rejected','fulfilled','breached','ended']}},required:['step'],additionalProperties:false},refreshAfter:{type:'boolean'}},required:['source','action'],additionalProperties:false}},
  privateTo:{type:'object',properties:{name:{type:'string'},source:{type:'string'}},required:['name','source'],additionalProperties:false},
 };
 if(allowLookup)properties.catalogGroups={type:'array',minItems:1,maxItems:groups.length,uniqueItems:true,items:{type:'string',enum:[...groups]}};
 return {type:'object',properties,additionalProperties:false,...(allowLookup?{anyOf:[{required:['catalogGroups']},{required:['channel','segments']}]}:{required:['channel','segments']})};
}
