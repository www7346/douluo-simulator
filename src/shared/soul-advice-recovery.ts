import {jsonEqual} from './json-identity';
import {rememberSoulAdvice,type CreationWorkspace} from './creation-draft';

/** Transport recovery metadata, deliberately outside the gameplay/save schema. */
export interface SoulAdviceTarget {index:number;side?:'buyer'|'captive';actorKey?:string}
export interface SoulAdviceRecovery {
 version:1;id:string;worldId:string;kind:'advice';input:Record<string,any>;target:SoulAdviceTarget;
 base:{owner:Record<string,any>;soul:Record<string,any>;request:string};createdAt:string;
 status:'pending'|'ready'|'conflict';value?:Record<string,any>;
}
export const soulAdviceRecoveryKey=(worldId:string)=>`soul-advice-recovery:${worldId}`;

function owner(workspace:CreationWorkspace,target:SoulAdviceTarget){
 const config=workspace.config,b=config.background;
 if(!b)return null;
 if(target.side){
  if(b.id!=='sealed-titled'||!target.actorKey?.startsWith(target.side+':'))return null;
  const slot=b.actors?.[target.side]??{source:'default'};
  const person=b.perspective===target.side?config:slot.config;
  return {background:b.id,side:target.side,actorKey:target.actorKey,name:person?.name??null,source:slot.source??'default',characterId:slot.characterId??null,buyerId:target.side==='buyer'?b.buyerId??null:null};
 }
 return {background:b.id,side:b.perspective??null,canonical:b.canonicalPlayer?.characterId??null,name:config.name??null};
}
function address(workspace:CreationWorkspace,target:SoulAdviceTarget){
 const config=workspace.config,b=config.background;
 if(target.side){
  if(!owner(workspace,target))return null;
  const configAtSide=b.perspective===target.side?config:b.actors?.[target.side]?.config;
  const editor=workspace.actorEditors?.[target.actorKey!]??{};
  return {soul:configAtSide?.martialSoulDrafts?.[target.index],request:editor.requests?.[target.index]??'',editor};
 }
 return {soul:config.martialSoulDrafts?.[target.index],request:workspace.requests?.[target.index]??'',editor:workspace};
}
export function createSoulAdviceRecovery(workspace:CreationWorkspace,input:Record<string,any>,target:SoulAdviceTarget,worldId:string):SoulAdviceRecovery{
 if(!Number.isSafeInteger(target.index)||target.index<0||target.index>2||target.side&&!['buyer','captive'].includes(target.side))throw Error('请选择需要构思的武魂');
 const at=address(workspace,target),identity=owner(workspace,target);
 if(!identity||!at?.soul||!jsonEqual(at.soul,input.currentDraft))throw Error('武魂草稿已改变，请按当前构想重新讨论');
 return {version:1,id:crypto.randomUUID(),worldId,kind:'advice',input:structuredClone(input),target:structuredClone(target),base:{owner:identity,soul:structuredClone(at.soul),request:at.request},createdAt:new Date().toISOString(),status:'pending'};
}
export function checkedSoulAdviceRecovery(value:unknown,worldId:string):SoulAdviceRecovery|null{
 if(value===null||value===undefined)return null;
 if(['creation-advice','creation-item-advice','creation-workshop-advice'].includes((value as any).kind))return null;
 const v=value as SoulAdviceRecovery;
 if(v.version!==1||v.kind!=='advice'||v.worldId!==worldId||typeof v.id!=='string'||!v.id||!v.input||typeof v.input!=='object'||!v.target||!Number.isSafeInteger(v.target.index)||v.target.index<0||v.target.index>2||!v.base?.soul||!v.base.owner||typeof v.base.request!=='string'||!['pending','ready','conflict'].includes(v.status)||typeof v.createdAt!=='string')throw Error('保留的武魂顾问任务无法核对，请导出故障诊断');
 return v;
}
export function soulAdviceSourceMatches(workspace:CreationWorkspace|null,record:SoulAdviceRecovery):boolean{
 if(!workspace||workspace.version!==5||!workspace.config)return false;
 const at=address(workspace,record.target),identity=owner(workspace,record.target);
 return !!at?.soul&&!!identity&&jsonEqual(identity,record.base.owner)&&jsonEqual(at.soul,record.base.soul)&&at.request===record.base.request;
}
export function soulAdviceAlreadyApplied(workspace:CreationWorkspace|null,record:SoulAdviceRecovery):boolean{
 if(!workspace||!record.value)return false;
 const at=address(workspace,record.target),identity=owner(workspace,record.target),advice=at?.editor.advisors?.[record.target.index];
 return !!at?.soul&&!!identity&&jsonEqual(identity,record.base.owner)&&jsonEqual(at.soul,record.base.soul)&&at.request===''&&jsonEqual(advice?.session,record.value.session)&&(record.value.mode==='question'||jsonEqual(advice?.proposal,record.value.inspection?.draft??null));
}
export function retainSoulAdviceValue(record:SoulAdviceRecovery,value:any):SoulAdviceRecovery{
 if(!value||typeof value!=='object'||!value.session||typeof value.session!=='object'||typeof value.advisorReply!=='string'||value.mode!==undefined&&!['question','proposal'].includes(value.mode))throw Error('取回的武魂建议不完整，原任务仍保留');
 return {...record,status:'ready',value:structuredClone(value)};
}
/** Merge only the addressed discussion; never replace character configuration. */
export function applySoulAdviceRecovery(workspace:CreationWorkspace,record:SoulAdviceRecovery):CreationWorkspace{
 if(!record.value)throw Error('原武魂建议尚未取回');
 if(soulAdviceAlreadyApplied(workspace,record))return workspace;
 if(!soulAdviceSourceMatches(workspace,record))throw Error('武魂草稿或讨论输入已改变，原建议保留，请先处理原任务');
 const {index,side,actorKey}=record.target;
 if(!side)return rememberSoulAdvice(workspace,index,record.value as any);
 const editor=workspace.actorEditors?.[actorKey!]??{};
 const projected={...workspace,advisors:editor.advisors??{},requests:editor.requests??{}};
 const remembered=rememberSoulAdvice(projected,index,record.value as any);
 return {...workspace,actorEditors:{...workspace.actorEditors,[actorKey!]:{...editor,advisors:remembered.advisors,requests:remembered.requests}}};
}
