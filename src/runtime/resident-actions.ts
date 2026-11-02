import {rules} from '../rules';
import {REALM_THEMES} from '../shared/realm-environments';
import {RESIDENT_ACTION_FIELDS,RESIDENT_ACTION_KINDS} from '../shared/resident-action-fields';
export {RESIDENT_ACTION_FIELDS,RESIDENT_ACTION_KINDS} from '../shared/resident-action-fields';
const permissions={type:'object',properties:Object.fromEntries(rules.interiorSpaces.LIMIT_KEYS.map((key:string)=>[key,{type:'boolean'}])),anyOf:rules.interiorSpaces.LIMIT_KEYS.map((key:string)=>({required:[key]})),additionalProperties:false};
const environment={type:'object',properties:{description:{type:'string',minLength:1,maxLength:1200},themeId:{type:'string',enum:REALM_THEMES.map(t=>t.id)}},required:['themeId'],additionalProperties:false};
const terms={type:'object',properties:{description:{type:'string',minLength:1,maxLength:600},service:{type:'object',properties:{kind:{type:'string',enum:['residence','cultivation']},minutes:{type:'integer',minimum:60,maximum:10080}},required:['kind','minutes'],additionalProperties:false},benefit:{type:'object',properties:{permissions:{...permissions,anyOf:rules.interiorSpaces.LIMIT_KEYS.map((key:string)=>({required:[key]}))}},required:['permissions'],additionalProperties:false}},required:['description','service','benefit'],additionalProperties:false};
export function residentActionMetadata(kind:string):Record<string,any>{
 if(kind==='request-person-growth')return {requiredParameters:['growth'],objectParameters:{growth:{oneOf:[{type:'object',properties:{kind:{type:'string',enum:['resume-cultivation','abandon-cultivation']},actionId:{type:'string'}},required:['kind','actionId'],additionalProperties:false},{type:'object',properties:{kind:{const:'cultivation'},minutes:{type:'integer',minimum:1,maximum:44640}},required:['kind','minutes'],additionalProperties:false},{type:'object',properties:{kind:{const:'beast-ring'},beastUnitId:{type:'string'}},required:['kind','beastUnitId'],additionalProperties:false},{type:'object',properties:{kind:{type:'string',enum:['item-ring','offered-ring']},itemId:{type:'string'}},required:['kind','itemId'],additionalProperties:false}]}}};
 if(kind==='set-realm-arrangement')return {requiredParameters:['characterId'],valueOptions:{fixture:['free','cross','suspended','cage'],hands:['free','front','back'],legs:['free','limited','locked'],footwear:['free','heels'],mouth:['free','gag']}};
 if(kind==='reshape-realm')return {objectParameters:{environment},requiredParameters:['realmId','regionId','environment']};
 if(kind==='set-resident-permissions')return {objectParameters:{permissions},requiredParameters:['permissions']};
 if(kind==='propose-performance-agreement')return {objectParameters:{terms},requiredParameters:['realmId','terms']};
 if(kind==='respond-performance-agreement')return {booleanParameters:['accept']};
 if(kind==='deploy-resident')return {valueOptions:{mode:['body','projection']},requiredParameters:['mode']};
 if(['reward-resident','punish-resident'].includes(kind))return {valueOptions:{method:Object.keys(rules.residentRealms.TREATMENTS[kind==='reward-resident'?'reward':'punish'])},requiredParameters:['method']};
 if(kind==='discuss-resident-tactics')return {sourceText:{parameter:'text',verbatim:true,maxLength:600},requiredParameters:['reservePercent'],ranges:{reservePercent:[0,100]}};
 return {};
}
/** Validate structured inputs without filling partial permission fields. */
export function validateResidentActionParameter(action:any,key:string){
 if(!RESIDENT_ACTION_KINDS.includes(action.kind))return false;const value=action[key];
 if(action.kind==='request-person-growth'&&key==='growth'){rules.personGrowth.source(value);return true;}
 if(key==='permissions'){if(!value||typeof value!=='object'||!Object.keys(value).length)throw Error('请指定至少一项活动许可');rules.interiorSpaces.restrictions(value);return true;}
 if(key==='terms'){rules.performanceAgreements.terms(value);return true;}
 if(key==='environment'){if(!value||Array.isArray(value)||Object.keys(value).some(k=>!['description','themeId'].includes(k))||value.description!==undefined&&(typeof value.description!=='string'||!value.description.trim()||value.description.length>1200)||!REALM_THEMES.some(t=>t.id===value.themeId))throw Error('请选择画境主题并描述环境');return true;}
 if(action.kind==='set-realm-arrangement'&&['fixture','hands','legs','footwear','mouth'].includes(key)){if(value===undefined)return true;if(!rules.realmArrangements.CHOICES[key]?.includes(value))throw Error('请选择实际支持的固定与装备方式');return true;}
 if(key==='accept'){if(typeof value!=='boolean')throw Error('须明确接受或拒绝协议');return true;}
 if(key==='mode'){if(!['body','projection'].includes(value))throw Error('出战方式须为真身或投影');return true;}
 if(key==='method'){if(!rules.residentRealms.TREATMENTS[action.kind==='reward-resident'?'reward':'punish'][value])throw Error('请选择实际支持的奖惩方式');return true;}
 if(['text','reason'].includes(key)){if(typeof value!=='string'||!value.trim()||value.length>600)throw Error('沟通与理由须为1至600字');return true;}
 return false;
}
