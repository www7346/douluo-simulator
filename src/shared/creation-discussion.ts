import {jsonEqual,jsonMatchesText} from './json-identity';
import type {CreationWorkspace} from './creation-draft';
export interface CreationDiscussion {
 request:string;
 exchanges:{input:string;reply:string}[];
 proposal?:{base:string;reply:string;patch:Record<string,any>};
}
export const blankCreationDiscussion=():CreationDiscussion=>({request:'',exchanges:[]});
export function validateCreationDiscussion(value:CreationDiscussion){
 if(!value||typeof value.request!=='string'||value.request.length>4000||!Array.isArray(value.exchanges)||value.exchanges.length>20||value.exchanges.some(e=>!e||typeof e.input!=='string'||!e.input.trim()||e.input.length>4000||typeof e.reply!=='string'||!e.reply.trim()||e.reply.length>2000))throw Error('角色讨论记录不完整或过长');
 const p=value.proposal;if(p&&(typeof p.base!=='string'||p.base.length>1000000||typeof p.reply!=='string'||p.reply.length>2000||!p.patch||typeof p.patch!=='object'||Array.isArray(p.patch)))throw Error('角色候选方案不完整');
 if(p&&Object.hasOwn(p.patch,'soulRequests')&&(!Array.isArray(p.patch.soulRequests)||p.patch.soulRequests.some((r:any)=>!r||!Number.isSafeInteger(r.index)||r.index<0||r.index>2||typeof r.description!=='string'||!r.description.trim()||r.description.length>4000)))throw Error('角色候选武魂构想不完整');
 if(p&&Object.hasOwn(p.patch,'opening')&&(!p.patch.opening||typeof p.patch.opening!=='object'||Array.isArray(p.patch.opening)||Object.keys(p.patch.opening).some(k=>!['talentIds','opportunities'].includes(k)||!Array.isArray(p.patch.opening[k]))))throw Error('角色候选机缘不完整');
 if(p&&Object.hasOwn(p.patch,'attributes')&&(!p.patch.attributes||typeof p.patch.attributes!=='object'||Array.isArray(p.patch.attributes)))throw Error('角色候选属性不完整');
}
export function rememberCreationAdvice(workspace:CreationWorkspace,base:string,input:string,result:{mode:string;reply:string;patch:Record<string,any>}):CreationWorkspace{
 const previous=workspace.characterDiscussion??blankCreationDiscussion();
 const discussion:CreationDiscussion={request:previous.request.trim()===input?'':previous.request,exchanges:[...previous.exchanges,{input,reply:result.reply}],...(result.mode==='proposal'?{proposal:{base,reply:result.reply,patch:structuredClone(result.patch)}}:previous.proposal?{proposal:previous.proposal}:{})};
 validateCreationDiscussion(discussion);return {...workspace,characterDiscussion:discussion};
}
export function adoptCreationAdvice(workspace:CreationWorkspace,proposal:NonNullable<CreationDiscussion['proposal']>,reviewed:Record<string,any>):CreationWorkspace{
 const recorded=workspace.characterDiscussion?.proposal;
 if(!jsonMatchesText(workspace.config,proposal.base)||!jsonMatchesText(workspace.config,recorded?.base)||!jsonEqual({...recorded,base:proposal.base},proposal))throw Error('草稿或候选方案已经改变，请重新讨论后采用');
 const discussion=workspace.characterDiscussion!;
 const requests={...workspace.requests};for(const r of proposal.patch.soulRequests??[])requests[r.index]=r.description;
 const reserveSouls=structuredClone(workspace.reserveSouls);workspace.config.martialSoulDrafts.forEach((s:any,i:number)=>{reserveSouls[i]=structuredClone(s);});reviewed.martialSoulDrafts.forEach((s:any,i:number)=>{reserveSouls[i]=structuredClone(s);});
 return {...workspace,requests,reserveSouls,activeSoul:Math.min(workspace.activeSoul,reviewed.martialSoulDrafts.length-1),config:structuredClone(reviewed),sourcePreferences:{...workspace.sourcePreferences,...Object.fromEntries((reviewed.opening?.opportunities??[]).filter((v:any)=>v.sourceId).map((v:any)=>[v.kind,v.sourceId]))},characterDiscussion:{request:discussion.request,exchanges:discussion.exchanges}};
}
