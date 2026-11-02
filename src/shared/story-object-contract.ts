import type {ModelJsonSchema} from './model-json-schema';

export const STORY_OBJECT_FROM_SCHEMA:ModelJsonSchema={type:'object',properties:{turn:{type:'integer',minimum:1},field:{type:'string',enum:['input','prose']}},required:['turn','field'],additionalProperties:false};
export const STORY_OBJECT_TEXT_SCHEMAS:Record<string,ModelJsonSchema>={name:{type:'string',minLength:1,maxLength:40},quote:{type:'string',minLength:1,maxLength:1000},reason:{type:'string',minLength:1,maxLength:160}};
export const STORY_OBJECT_DETAILS_SCHEMA:ModelJsonSchema={type:'array',maxItems:6,items:{
 type:'object',properties:{
  field:{type:'string',enum:['name','identity','occupation','appearance','gender','age','holder','owner']},
  value:{type:['string','integer'],description:'逐字取自quote的文字；年龄为原文明确的整数'},
  quote:{type:'string',description:'同一来源中的原句'},
  basis:{type:'string',enum:['observed','reported'],description:'当前玩家自述为reported；observed须逐字引用from指定的历史正文'},
 },required:['field','value','quote','basis'],additionalProperties:false,
}};
