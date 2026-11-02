import {jsonEqual} from './json-identity';
import type {CreationWorkspace} from './creation-draft';
import {blankCreationDiscussion,rememberCreationAdvice} from './creation-discussion';
import {blankItemDiscussion,rememberItemAdvice} from './creation-item-discussion';
import {workshopAdviceConfig,workshopAdviceMatches,rememberWorkshopAdvice,workshopDiscussion,withWorkshopDiscussion} from './opening-workshop-advice';

export type CreationAdvisorKind='creation-advice'|'creation-item-advice'|'creation-workshop-advice';
export interface CreationAdvisorTarget {side?:'buyer'|'captive';actorKey?:string;designId?:string}
export interface CreationAdvisorRecovery {
 version:1;id:string;worldId:string;kind:CreationAdvisorKind;input:Record<string,any>;target:CreationAdvisorTarget;
 base:{owner:Record<string,any>;config:Record<string,any>;discussion:Record<string,any>};createdAt:string;
 status:'pending'|'ready'|'conflict';value?:Record<string,any>;
}
export interface CreationAdvisorAnswer {id:string;value:any;alreadyApplied:boolean}
const kinds=['creation-advice','creation-item-advice','creation-workshop-advice'];
const fields=['name','age','gender','origin','appearance','attributes','martialSoulCount','martialSoulDrafts'];
const body=(config:any)=>Object.fromEntries(fields.map(key=>[key,config?.[key]]));
const clone=<T,>(v:T):T=>structuredClone(v);

function source(workspace:CreationWorkspace,kind:CreationAdvisorKind,target:CreationAdvisorTarget){
 if(!workspace?.config)return null;
 const config=workspace.config,b=config.background;
 if(!b)return null;
 let projected=workspace,owner:Record<string,any>={background:b.id,perspective:b.perspective,canonical:b.canonicalPlayer?.characterId??null,name:config.name};
 if(target.side){
  if(kind!=='creation-advice'||b.id!=='sealed-titled'||!target.actorKey?.startsWith(target.side+':'))return null;
  const slot=b.actors?.[target.side],at=b.perspective===target.side?config:slot?.config;
  if(!at)return null;
  const editor=workspace.actorEditors?.[target.actorKey!]??{};
  projected={...workspace,...editor,config:{...config,...body(at),background:{...b,perspective:target.side}}};
  owner={background:b.id,side:target.side,actorKey:target.actorKey,source:slot?.source??'default',characterId:slot?.characterId??null,name:at.name,buyerId:target.side==='buyer'?b.buyerId:null};
 }
 const discussion=kind==='creation-advice'?projected.characterDiscussion??blankCreationDiscussion():kind==='creation-item-advice'?projected.itemDiscussion??blankItemDiscussion():workshopDiscussion(config.openingWorkshop??{},target.designId);
 let basis=kind==='creation-workshop-advice'?workshopAdviceConfig(projected.config):projected.config;
 if(target.side){const {background,...rest}=basis;const {actors,ringChoices,...selection}=background;basis={...rest,background:selection};}
 if(kind==='creation-workshop-advice'&&!config.openingWorkshop?.designs?.some((d:any)=>d.id===target.designId))return null;
 return {owner,config:basis,discussion,projected};
}
export function checkedCreationAdvisorRecovery(value:unknown,worldId:string):CreationAdvisorRecovery|null{
 if(value==null||(value as any).kind==='advice')return null;
 const v=value as CreationAdvisorRecovery;
 if(v.version!==1||!kinds.includes(v.kind)||v.worldId!==worldId||typeof v.id!=='string'||!v.id||!v.input||typeof v.input!=='object'||!v.target||!v.base?.config||!v.base.owner||!v.base.discussion||typeof v.createdAt!=='string'||!['pending','ready','conflict'].includes(v.status))throw Error('保留的创作任务无法核对，请导出故障诊断');
 return v;
}
export function createCreationAdvisorRecovery(workspace:CreationWorkspace,kind:CreationAdvisorKind,input:Record<string,any>,target:CreationAdvisorTarget,worldId:string):CreationAdvisorRecovery{
 const at=source(workspace,kind,target);
 if(!at)throw Error('请选择需要讨论的人物或作品');
 // Actor editors project the selected character into the same full creation config.
 const inputWorkspace={...at.projected,config:input.config} as CreationWorkspace;
 const expected=source(inputWorkspace,kind,target.side?{}:target);
 const inputBasis=target.side?{...input.config,background:{...at.config.background}}:expected?.config;
 if(!jsonEqual(at.config,inputBasis)||at.discussion.request.trim()!==input.description)throw Error('草稿或讨论输入已改变，请按当前设定重新讨论');
 return {version:1,id:crypto.randomUUID(),worldId,kind,input:clone(input),target:clone(target),base:{owner:clone(at.owner),config:clone(at.config),discussion:clone(at.discussion)},createdAt:new Date().toISOString(),status:'pending'};
}
export function creationAdvisorSourceMatches(workspace:CreationWorkspace|null,record:CreationAdvisorRecovery){
 if(workspace?.version!==5)return false;
 const at=source(workspace,record.kind,record.target);
 return !!at&&jsonEqual(at.owner,record.base.owner)&&(record.kind==='creation-workshop-advice'?workshopAdviceMatches(workspace.config,JSON.stringify(record.base.config)):jsonEqual(at.config,record.base.config))&&jsonEqual(at.discussion,record.base.discussion);
}
function expectedDiscussion(record:CreationAdvisorRecovery){
 if(!record.value)throw Error('原创作答复尚未取回');
 const base=JSON.stringify(record.input.config),workspace={config:record.input.config,characterDiscussion:record.base.discussion,itemDiscussion:record.base.discussion} as CreationWorkspace;
 if(record.kind==='creation-advice')return rememberCreationAdvice(workspace,base,record.input.description,record.value as any).characterDiscussion!;
 if(record.kind==='creation-item-advice')return rememberItemAdvice(workspace,base,record.input.description,record.value as any).itemDiscussion!;
 return rememberWorkshopAdvice(record.base.discussion,JSON.stringify(workshopAdviceConfig(record.input.config)),record.input.description,record.value,record.target.designId!);
}
export function creationAdvisorAlreadyApplied(workspace:CreationWorkspace|null,record:CreationAdvisorRecovery){
 if(workspace?.version!==5||!record.value)return false;
 const at=source(workspace,record.kind,record.target);
 return !!at&&jsonEqual(at.owner,record.base.owner)&&(record.kind==='creation-workshop-advice'?workshopAdviceMatches(workspace.config,JSON.stringify(record.base.config)):jsonEqual(at.config,record.base.config))&&jsonEqual(at.discussion,expectedDiscussion(record));
}
export function retainCreationAdvisorValue(record:CreationAdvisorRecovery,value:any):CreationAdvisorRecovery{
 if(!value||typeof value!=='object'||!['question','proposal'].includes(value.mode)||typeof value.reply!=='string'||!value.reply.trim())throw Error('取回的创作答复不完整，原任务仍保留');
 const ready={...record,status:'ready' as const,value:clone(value)};expectedDiscussion(ready);return ready;
}
/** Only discussions and unadopted proposals change. Gameplay configuration never does. */
export function applyCreationAdvisorRecovery(workspace:CreationWorkspace,record:CreationAdvisorRecovery):CreationWorkspace{
 if(creationAdvisorAlreadyApplied(workspace,record))return workspace;
 if(!creationAdvisorSourceMatches(workspace,record))throw Error('草稿或讨论输入已改变，原答复保留，请先处理原任务');
 const discussion=expectedDiscussion(record);
 if(record.kind==='creation-advice'){
  if(record.target.side){const key=record.target.actorKey!;return {...workspace,actorEditors:{...workspace.actorEditors,[key]:{...workspace.actorEditors?.[key],characterDiscussion:discussion}}};}
  return {...workspace,characterDiscussion:discussion as any};
 }
 if(record.kind==='creation-item-advice')return {...workspace,itemDiscussion:discussion as any};
 return {...workspace,config:{...workspace.config,openingWorkshop:withWorkshopDiscussion(workspace.config.openingWorkshop,record.target.designId!,discussion)}};
}
