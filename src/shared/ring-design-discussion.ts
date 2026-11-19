import {jsonEqual,stableJson} from './json-identity';
export interface RingDesignDiscussion {
 version:1;identity?:string;request:string;exchanges:{input:string;reply:string}[];
 answer?:any;answerTarget?:any;pending?:{input:any;value?:any;notStarted?:true};
 preserveText?:boolean;manual?:any;lastProposals?:any[];undo?:RingDesignRevision[];redo?:RingDesignRevision[];
}
export type RingDesignRevision=Pick<RingDesignDiscussion,'request'|'exchanges'|'answer'|'answerTarget'|'manual'|'lastProposals'>;
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
 if(value.version!==1||!validRevision(value)||value.preserveText!==undefined&&typeof value.preserveText!=='boolean'||['undo','redo'].some(key=>value[key]!==undefined&&(!Array.isArray(value[key])||value[key].length>20||value[key].some((r:any)=>!validRevision(r))))||JSON.stringify(value).length>16000000)throw Error('保留的魂环讨论资料不完整或过大，请先导出故障诊断');
 if(value.pending&&(!value.pending.input||typeof value.pending.input.description!=='string'||!value.pending.input.target))throw Error('原魂环讨论任务不完整，尚未发送新的请求');
 if(value.pending?.notStarted!==undefined&&(value.pending.notStarted!==true||value.pending.value!==undefined))throw Error('未派发的设计记录与已有结果不一致，请保留原记录');
 return value;
}
function validRevision(value:any){return value&&(value.lastProposals===undefined||Array.isArray(value.lastProposals)&&value.lastProposals.length<=3)&&typeof value.request==='string'&&value.request.length<=4000&&Array.isArray(value.exchanges)&&value.exchanges.every((e:any)=>typeof e?.input==='string'&&e.input.length<=4000&&typeof e.reply==='string'&&e.reply.length<=2000);}
function revision(value:RingDesignDiscussion):RingDesignRevision{return structuredClone({request:value.request,exchanges:value.exchanges,...(value.answer?{answer:value.answer}:{}),...(value.answerTarget?{answerTarget:value.answerTarget}:{}),...(value.manual?{manual:value.manual}:{}),...(value.lastProposals?{lastProposals:value.lastProposals}:{})});}
function retainedRevisions(rows:RingDesignRevision[]){const kept=rows.slice(-20);while(kept.length>1&&JSON.stringify(kept).length>3000000)kept.shift();return kept;}
/** History belongs to the saved design, independently of the bounded model context. */
export function checkpointRingDiscussion(before:RingDesignDiscussion,next:RingDesignDiscussion):RingDesignDiscussion{
 if(before.pending)throw Error('请先取回原设计答复，再修改版本');
 return checkedRingDiscussion({...next,undo:retainedRevisions([...(before.undo??[]),revision(before)]),redo:[]});
}
export function restoreRingDiscussion(record:RingDesignDiscussion,direction:'undo'|'redo'):RingDesignDiscussion{
 if(record.pending)throw Error('请先取回原设计答复，再切换版本');
 const from=record[direction]??[],selected=from.at(-1);if(!selected)return record;
 const other=direction==='undo'?'redo':'undo',next={...record,request:selected.request,exchanges:structuredClone(selected.exchanges),answer:structuredClone(selected.answer),answerTarget:structuredClone(selected.answerTarget),manual:structuredClone(selected.manual),lastProposals:structuredClone(selected.lastProposals),[direction]:from.slice(0,-1),[other]:retainedRevisions([...(record[other]??[]),revision(record)])};
 return checkedRingDiscussion(next);
}
/** Keep the complete conversation locally; send the first intent and recent turns. */
export function ringDiscussionContext(exchanges:RingDesignDiscussion['exchanges']){
 if(exchanges.length<=8)return structuredClone(exchanges);
 return structuredClone([exchanges[0],...exchanges.slice(-7)]);
}
export function retainRingAnswer(record:RingDesignDiscussion,input:any,value:any){
 if(!record.pending||!jsonEqual(record.pending.input,input))throw Error('原魂环讨论已经改变，答复未覆盖新构想');
 if(!value||!['question','proposal'].includes(value.mode)||typeof value.reply!=='string'||!value.reply.trim())throw Error('魂环主持人的答复不完整，原任务仍保留');
 return checkedRingDiscussion({...record,pending:{input:structuredClone(input),value:structuredClone(value)}});
}
export function finishRingAnswer(record:RingDesignDiscussion,input:any,value:any){
 const ready=retainRingAnswer(record,input,value);
 const {pending,...before}=ready;
 return checkpointRingDiscussion(before,{...before,request:ready.request===input.description?'':ready.request,exchanges:[...ready.exchanges,{input:input.description,reply:value.reply}],answer:structuredClone(value),lastProposals:structuredClone(value.proposals?.length?value.proposals:ready.answer?.proposals?.length?ready.answer.proposals:ready.lastProposals),answerTarget:structuredClone(input.target)});
}
