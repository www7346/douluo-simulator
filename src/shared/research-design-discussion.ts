import {jsonEqual} from './json-identity';
import {ringDiscussionKey} from './ring-design-discussion';

const categories=['魂导器','丹药','毒药','暗器','拘束器'];
export interface ResearchDesignDiscussion {
 version:1;request:string;exchanges:{input:string;reply:string}[];
 answer?:any;answerBasis?:any;pending?:{input:any;value?:any;notStarted?:true};
}
export const blankResearchDiscussion=():ResearchDesignDiscussion=>({version:1,request:'',exchanges:[]});
export function researchDiscussionKey(worldId:string,category:string){
 const ordinal=categories.indexOf(category)+1;if(!ordinal)throw Error('请选择已有的工坊品类');
 return ringDiscussionKey(worldId,{kind:'opening',side:'research',ordinal}).replace('ring-design:','research-design:');
}
export const researchActiveDiscussionKey=(worldId:string)=>researchDiscussionKey(worldId,categories[0]).replace('research-design:','research-active:');
export function checkedResearchDiscussion(value:any):ResearchDesignDiscussion {
 if(value==null)return blankResearchDiscussion();
 if(value.version!==1||typeof value.request!=='string'||value.request.length>4000||!Array.isArray(value.exchanges)||value.exchanges.length>20||value.exchanges.some((v:any)=>typeof v?.input!=='string'||v.input.length>4000||typeof v.reply!=='string'||v.reply.length>2000)||JSON.stringify(value).length>1000000)throw Error('保留的工坊讨论资料不完整，请保留故障诊断');
 if(value.pending&&(!value.pending.input||!categories.includes(value.pending.input.category)||typeof value.pending.input.description!=='string'))throw Error('原工坊设计任务不完整，未发送新请求');
 if(value.pending?.notStarted!==undefined&&(value.pending.notStarted!==true||value.pending.value!==undefined))throw Error('未派发的设计记录与已有结果不一致，请保留原记录');
 return value;
}
export function retainResearchAnswer(record:ResearchDesignDiscussion,input:any,value:any):ResearchDesignDiscussion {
 if(!record.pending||!jsonEqual(record.pending.input,input))throw Error('原工坊讨论已经改变，答复未覆盖新构想');
 if(!value||!['question','proposal'].includes(value.mode)||typeof value.reply!=='string'||!value.reply.trim())throw Error('工坊主持人的答复不完整，原任务仍保留');
 return checkedResearchDiscussion({...record,pending:{input:structuredClone(input),value:structuredClone(value)}});
}
export function finishResearchAnswer(record:ResearchDesignDiscussion,input:any,value:any):ResearchDesignDiscussion {
 const ready=retainResearchAnswer(record,input,value);
 return checkedResearchDiscussion({version:1,request:ready.request===input.description?'':ready.request,exchanges:[...ready.exchanges,{input:input.description,reply:value.reply}],answer:structuredClone(value),answerBasis:structuredClone(input.basis)});
}
