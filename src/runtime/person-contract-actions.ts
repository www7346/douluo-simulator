import {rules} from '../rules';

export const PERSON_CONTRACT_ACTION_FIELDS:Record<string,string[]>={
 'propose-person-contract':['characterId','contractKind','terms','source'],
 'respond-person-contract':['contractId','versionHash','decision','terms','source','reason'],
 'retry-person-contract':['contractId','versionHash'],
 'end-person-contract':['contractId','versionHash'],
 'declare-person-contract-breach':['contractId','versionHash'],
 'issue-person-contract-order':['contractId','versionHash','clauseId','action'],
 'decline-person-contract-order':['contractId','versionHash','orderId'],
 'form-controlled-contract':['characterId','skillId','branchIds','terms'],
 'withdraw-control-source':['statusId'],
};
const string={type:'string',minLength:1,maxLength:240};
const clauseBase={id:string,obligorId:string,beneficiaryId:string};
const clause=(kind:string,properties:Record<string,any>={},required:string[]=[])=>({type:'object',properties:{...clauseBase,kind:{type:'string',enum:[kind]},...properties},required:['kind','obligorId','beneficiaryId',...required],additionalProperties:false});
const shop={shopId:string,merchantId:string,itemId:string,templateId:string,fingerprint:string,direction:{type:'string',enum:['buy','sell']},unitPrice:{type:'integer',minimum:0,maximum:1000000000},pieces:{type:'integer',minimum:1,maximum:999999}};
const terms={type:'object',properties:{durationMinutes:{type:'integer',minimum:1,maximum:5184000},clauses:{type:'array',minItems:1,maxItems:12,items:{anyOf:[clause('no-attack'),clause('obey-domain',{domain:{type:'string',enum:rules.personContracts.DOMAINS}},['domain']),clause('delivery',{evidenceKind:{type:'string',enum:['controlled-gift']},evidenceId:string},['evidenceKind','evidenceId']),clause('performance',{agreementId:string},['agreementId']),clause('master-slave'),clause('shop-price',shop,['shopId','merchantId','direction','unitPrice'])]}}},required:['clauses'],additionalProperties:false};
const source={type:'object',properties:{actorId:string,skillId:string,branchId:string,selection:{type:'object',properties:{nodeId:string,params:{type:'object',additionalProperties:true}},additionalProperties:false}},required:['skillId'],additionalProperties:false};
const commandTypes=['speak-person','use-field-ability','travel','equip','unequip','技能','防御','放弃行动','切换武魂'];
const command={type:'object',properties:{type:{type:'string',enum:commandTypes},text:{type:'string',minLength:1,maxLength:2000},...Object.fromEntries(['skillId','targetId','destinationId','itemId','slot','martialSoulId'].map(k=>[k,string])),targetIds:{type:'array',items:string,minItems:1,maxItems:24,uniqueItems:true}},required:['type'],additionalProperties:false};
export function personContractActionMetadata(kind:string):Record<string,any>{
 if(!Object.hasOwn(PERSON_CONTRACT_ACTION_FIELDS,kind))return {};
 const fields=PERSON_CONTRACT_ACTION_FIELDS[kind],only=(value:Record<string,any>)=>Object.fromEntries(Object.entries(value).filter(([key])=>fields.includes(key)));
 const optional=kind==='propose-person-contract'?['contractKind','source']:kind==='respond-person-contract'?['terms','source','reason']:kind==='form-controlled-contract'?['branchIds']:[];
 return {requiredParameters:fields.filter(k=>!optional.includes(k)&&!['characterId','characterStep'].includes(k)),optionalParameters:optional,objectParameters:only({terms,source,action:command}),arrayParameters:only({branchIds:{items:'string',minItems:1,maxItems:24,uniqueItems:true}}),valueOptions:only({contractKind:['ordinary','soul'],decision:['accept','reject','counter']})};
}
const plain=(v:any)=>!!v&&typeof v==='object'&&!Array.isArray(v);
const text=(v:any)=>typeof v==='string'&&v.trim().length>0&&v.length<=240;
export function validatePersonContractActionParameter(action:any,key:string):boolean{
 if(!Object.hasOwn(PERSON_CONTRACT_ACTION_FIELDS,action.kind))return false;const v=action[key];
 if(key==='reason'){if(v!==undefined&&(typeof v!=='string'||!v.trim()||v.length>600))throw Error('本人回应理由须为1至600字');return true;}
 if(key==='contractKind'){if(v!==undefined&&!['ordinary','soul'].includes(v))throw Error('契约类型无效');return true;}
 if(key==='terms'){if(v===undefined&&action.kind==='respond-person-contract'&&action.decision!=='counter')return true;if(action.kind==='respond-person-contract'&&action.decision!=='counter')throw Error('接受或拒绝不能夹带新条款，请明确反提');const ids=[...new Set((v?.clauses??[]).flatMap((c:any)=>[c.obligorId,c.beneficiaryId]))];if(ids.length!==2)throw Error('条款须涉及恰好两名当事人');rules.personContracts.normalizeTerms(v,ids);return true;}
 if(key==='source'){if(v===undefined)return true;if(action.kind==='respond-person-contract'&&action.decision!=='counter')throw Error('接受或拒绝不能替换能力来源');if(!plain(v)||Object.keys(v).some(k=>!['actorId','skillId','branchId','selection'].includes(k))||!text(v.skillId)||['actorId','branchId'].some(k=>v[k]!==undefined&&!text(v[k])))throw Error('须引用实际能力来源');if(v.selection!==undefined){const x=v.selection;if(!plain(x)||Object.keys(x).some(k=>!['nodeId','params'].includes(k))||x.nodeId!==undefined&&!text(x.nodeId))throw Error('须选择实际处罚方案');if(x.params!==undefined&&(!plain(x.params)||Object.keys(x.params).length>16||Object.values(x.params).some((n:any)=>!Number.isSafeInteger(n)&&!text(n)&&!(plain(n)&&Object.keys(n).length<=16&&Object.values(n).every(v=>Number.isSafeInteger(v)||text(v))))))throw Error('惩罚参数无效');}return true;}
 if(key==='decision'){if(!['accept','reject','counter'].includes(v))throw Error('回应须为同意、拒绝或反提');return true;}
 if(key==='branchIds'){if(v!==undefined&&(!Array.isArray(v)||!v.length||v.length>24||v.some(x=>!text(x))||new Set(v).size!==v.length))throw Error('分支引用无效');return true;}
 if(key==='action'){if(!plain(v)||!commandTypes.includes(v.type)||Object.keys(v).some(k=>!Object.hasOwn(command.properties,k))||Object.entries(v).some(([k,x])=>k!=='targetIds'&&(k==='text'?typeof x!=='string'||!x.trim()||x.length>2000:!text(x)))||v.targetIds!==undefined&&(!Array.isArray(v.targetIds)||!v.targetIds.length||v.targetIds.length>24||v.targetIds.some((x:any)=>!text(x))||new Set(v.targetIds).size!==v.targetIds.length))throw Error('命令须引用有限正式行动');return true;}
 return false;
}
