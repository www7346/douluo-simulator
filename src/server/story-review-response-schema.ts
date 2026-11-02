import type {ModelJsonSchema} from '../shared/model-json-schema';
import type {StoryKeyCheck} from './story-review-checks';
export function storyReviewResponseSchema(checks:StoryKeyCheck[],passages:string[],evidence:string[]):ModelJsonSchema{
 const ids=(values:string[])=>({type:'string',...(values.length?{enum:values}:{minLength:1})});
 const text={type:'string',minLength:1,maxLength:600},passageIds={type:'array',items:ids(passages),uniqueItems:true},importance={type:'string',enum:['key-fact','detail','uncertain']};
 const claim={anyOf:[{type:'object',properties:{kind:{type:'string',enum:['asserted']},quote:{type:'string',minLength:1,maxLength:24000}},required:['kind','quote'],additionalProperties:false},{type:'object',properties:{kind:{type:'string',enum:['omitted']}},required:['kind'],additionalProperties:false}]};
 const common={id:ids(checks.map(check=>check.id)),passageIds};
 const entry=(status:string,extra:Record<string,any>,required:string[])=>({type:'object',properties:{...common,status:{type:'string',enum:[status]},...extra},required:['id','status','passageIds',...required],additionalProperties:false});
 return {type:'object',properties:{checks:{type:'array',minItems:checks.length,maxItems:checks.length,items:{anyOf:[
  entry('consistent',{},[]),entry('not-mentioned',{reason:text,impact:text},['reason','impact']),entry('uncertain',{reason:text,impact:text},['reason','impact']),
  entry('contradicted',{reason:text,impact:text,importance,conflictPassageIds:{...passageIds,minItems:1},claim},['reason','impact','importance','conflictPassageIds','claim']),
 ]}},findings:{type:'array',maxItems:8,items:{type:'object',properties:{difference:{type:'string',enum:['identity','ability','action','outcome','decision','expression','uncertain']},importance,passageId:ids(passages),evidenceIds:{type:'array',items:ids(evidence),minItems:1,uniqueItems:true},reason:text,impact:text,claim},required:['difference','importance','passageId','evidenceIds','reason','impact','claim'],additionalProperties:false}}},required:['checks','findings'],additionalProperties:false};
}
