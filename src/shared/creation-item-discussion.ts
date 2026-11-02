import {jsonEqual,jsonMatchesText} from './json-identity';
import type {CreationWorkspace} from './creation-draft';
export interface CreationItemDiscussion {
 request:string;
 exchanges:{input:string;reply:string}[];
 proposal?:{base:string;reply:string;items:Record<string,any>[]};
}
export const blankItemDiscussion=():CreationItemDiscussion=>({request:'',exchanges:[]});
export function validateItemDiscussion(value:CreationItemDiscussion){
 if(!value||Object.keys(value).some(k=>!['request','exchanges','proposal'].includes(k))||typeof value.request!=='string'||value.request.length>4000||!Array.isArray(value.exchanges)||value.exchanges.length>20||value.exchanges.some(e=>!e||Object.keys(e).some(k=>!['input','reply'].includes(k))||typeof e.input!=='string'||!e.input.trim()||e.input.length>4000||typeof e.reply!=='string'||!e.reply.trim()||e.reply.length>2000))throw Error('道具讨论记录不完整或过长');
 const p=value.proposal;
 if(p&&(Object.keys(p).some(k=>!['base','reply','items'].includes(k))||typeof p.base!=='string'||p.base.length>1000000||typeof p.reply!=='string'||!p.reply.trim()||p.reply.length>2000||!Array.isArray(p.items)||!p.items.length||p.items.length>6||p.items.some(i=>!i||typeof i!=='object'||Array.isArray(i))))throw Error('道具候选方案不完整');
}
export function rememberItemAdvice(workspace:CreationWorkspace,base:string,input:string,result:{mode:string;reply:string;items?:Record<string,any>[]}){
 const previous=workspace.itemDiscussion??blankItemDiscussion();
 const itemDiscussion:CreationItemDiscussion={request:previous.request.trim()===input?'':previous.request,exchanges:[...previous.exchanges,{input,reply:result.reply}],...(result.mode==='proposal'?{proposal:{base,reply:result.reply,items:structuredClone(result.items!)}}:previous.proposal?{proposal:previous.proposal}:{})};
 validateItemDiscussion(itemDiscussion);return {...workspace,itemDiscussion};
}
export function adoptItemAdvice(workspace:CreationWorkspace,proposal:NonNullable<CreationItemDiscussion['proposal']>,reviewed:{items:Record<string,any>[];quote:{pass:boolean}}){
 const recorded=workspace.itemDiscussion?.proposal;
 if(!jsonMatchesText(workspace.config,proposal.base)||!jsonMatchesText(workspace.config,recorded?.base)||!jsonEqual({...recorded,base:proposal.base},proposal))throw Error('角色草稿或道具候选已改变，请重新讨论后采用');
 if(!reviewed.quote.pass||!jsonEqual(reviewed.items,proposal.items))throw Error('这套器具设计尚不能采用，请调整后重新讨论');
 return {...workspace,config:{...workspace.config,background:{...workspace.config.background,creationItems:structuredClone(reviewed.items)}},itemDiscussion:{request:workspace.itemDiscussion!.request,exchanges:workspace.itemDiscussion!.exchanges}};
}
