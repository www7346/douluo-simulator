import {jsonEqual,stableJson} from './json-identity';
export interface RingDesignDiscussion {
 version:1;identity?:string;request:string;exchanges:{input:string;reply:string}[];
 answer?:any;answerTarget?:any;pending?:{input:any;value?:any;notStarted?:true};
}
export const blankRingDiscussion=():RingDesignDiscussion=>({version:1,request:'',exchanges:[]});
/** Workshop images and its discussion have no part in ring mechanics. Keep the
 * valid creation fields, without copying image attachments into every turn. */
export function ringAdviceTarget(target:any){
 const next=structuredClone(target);
 if(next?.kind==='opening'){
  delete next.config.openingWorkshop;
  for(const actor of Object.values(next.config.background?.actors??{}) as any[])if(actor.config)delete actor.config.openingWorkshop;
 }
 return next;
}
export function ringDiscussionIdentity(worldId:string,target:any){
 const part=target?.kind==='opening'?['opening',target.side,target.ordinal]:target?.kind==='item'?['item',target.itemId,target.martialSoulId]:target?.kind==='beast'?['beast',target.beastUnitId,target.martialSoulId]:null;
 if(!part||part.some(v=>v===undefined||v===null||String(v).length>600))throw Error('请选择要讨论的魂环');
 return stableJson([worldId,...part]);
}
export function ringDiscussionKey(worldId:string,target:any){
 const identity=ringDiscussionIdentity(worldId,target);
 let left=2166136261,right=2246822507;
 for(let i=0;i<identity.length;i++){left=Math.imul(left^identity.charCodeAt(i),16777619);right=Math.imul(right^identity.charCodeAt(i),3266489909);}
 return 'ring-design:'+[left,right].map(v=>(v>>>0).toString(16).padStart(8,'0')).join('');
}
export const ringActiveDiscussionKey=(worldId:string)=>ringDiscussionKey(worldId,{kind:'opening',side:'active',ordinal:0}).replace('ring-design:','ring-active:');
export function checkedRingDiscussion(value:any):RingDesignDiscussion{
 if(value==null)return blankRingDiscussion();
 if(value.version!==1||typeof value.request!=='string'||value.request.length>4000||!Array.isArray(value.exchanges)||value.exchanges.length>20||value.exchanges.some((e:any)=>typeof e?.input!=='string'||e.input.length>4000||typeof e.reply!=='string'||e.reply.length>2000)||JSON.stringify(value).length>1000000)throw Error('保留的魂环讨论资料不完整，请先导出故障诊断');
 if(value.pending&&(!value.pending.input||typeof value.pending.input.description!=='string'||!value.pending.input.target))throw Error('原魂环讨论任务不完整，尚未发送新的请求');
 if(value.pending?.notStarted!==undefined&&(value.pending.notStarted!==true||value.pending.value!==undefined))throw Error('未派发的设计记录与已有结果不一致，请保留原记录');
 return value;
}
export function retainRingAnswer(record:RingDesignDiscussion,input:any,value:any){
 if(!record.pending||!jsonEqual(record.pending.input,input))throw Error('原魂环讨论已经改变，答复未覆盖新构想');
 if(!value||!['question','proposal'].includes(value.mode)||typeof value.reply!=='string'||!value.reply.trim())throw Error('魂环主持人的答复不完整，原任务仍保留');
 return checkedRingDiscussion({...record,pending:{input:structuredClone(input),value:structuredClone(value)}});
}
export function finishRingAnswer(record:RingDesignDiscussion,input:any,value:any){
 const ready=retainRingAnswer(record,input,value);
 return checkedRingDiscussion({version:1,...(ready.identity?{identity:ready.identity}:{}),request:ready.request===input.description?'':ready.request,exchanges:[...ready.exchanges,{input:input.description,reply:value.reply}],answer:structuredClone(value),answerTarget:structuredClone(input.target)});
}
