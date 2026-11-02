import './opening-workshop-image-core.js';
import {jsonEqual} from './json-identity';
type Selection=Record<string,any>;
export type WorkshopTab='host'|'manual'|'templates'|'library';
export const WORKSHOP_CATEGORIES=Object.freeze(['魂导器','丹药','毒药','暗器','拘束器','工具','情具']);
const blank=()=>({request:'',exchanges:[] as Record<string,any>[]});
const legacyOwner=(s:Selection)=>s.discussion?.proposal?.designId??s.activeDesignId??s.designs?.[0]?.id;
export function workshopDiscussion(s:Selection,designId?:string):Record<string,any>{
 if(!designId)return {...blank(),request:s.emptyRequest??''};
 return s.discussions?.[designId]??(legacyOwner(s)===designId?s.discussion:undefined)??blank();
}
/** Legacy single-work discussions stay readable. Pin their owner before switching work. */
function pinLegacy(s:Selection):Selection {
 if(!s.discussion)return s;
 const id=legacyOwner(s);if(!id)return s;
 const {discussion,...rest}=s;return {...rest,discussions:{[id]:discussion,...s.discussions}};
}
export function withWorkshopDiscussion(s:Selection,designId:string,discussion:Record<string,any>):Selection {
 if(!s.designs?.some((d:any)=>d.id===designId))throw Error('原作品已移除，主持人的答复仍保留');
 if(!s.discussions&&s.discussion&&legacyOwner(s)===designId)return {...s,discussion};
 return {...pinLegacy(s),discussions:{...pinLegacy(s).discussions,[designId]:structuredClone(discussion)}};
}
export function workshopTab(s:Selection):WorkshopTab {
 return s.activeTab??s.workModes?.[s.activeDesignId??s.designs?.[0]?.id]??'host';
}
export function selectWorkshopDesign(s:Selection,id:string):Selection {
 if(!s.designs?.some((d:any)=>d.id===id))throw Error('请选择已有作品');
 return {...pinLegacy(s),activeDesignId:id,activeTab:s.workModes?.[id]??'host'};
}
export function setWorkshopTab(s:Selection,tab:WorkshopTab):Selection {
 const id=s.activeDesignId??s.designs?.[0]?.id;
 return {...pinLegacy(s),activeTab:tab,...(id&&['host','manual'].includes(tab)?{workModes:{...s.workModes,[id]:tab}}:{})};
}
export function addWorkshopDesign(s:Selection,design:Record<string,any>,editor?:'host'|'manual'):Selection {
 if(s.designs?.some((d:any)=>d.id===design.id))throw Error('作品编号已存在');
 const next=pinLegacy(s),mode=editor??(workshopTab(s)==='manual'?'manual':'host');
 return {...next,designs:[...(s.designs??[]),structuredClone(design)],activeDesignId:design.id,activeTab:mode,workModes:{...s.workModes,[design.id]:mode},discussions:{...next.discussions,[design.id]:{...blank(),request:s.emptyRequest??''}},emptyRequest:''};
}
export function removeWorkshopDesign(s:Selection,id:string):Selection {
 const next=pinLegacy(s),designs=s.designs.filter((d:any)=>d.id!==id),{[id]:removedDiscussion,...discussions}=next.discussions??{}, {[id]:removedMode,...workModes}=s.workModes??{};
 const {activeDesignId,discussion,...rest}=next,owner=legacyOwner(next);
 return {...rest,designs,discussions,workModes,...(discussion&&owner!==id?{discussion}:{}),...(designs[0]?{activeDesignId:designs[0].id,activeTab:workModes[designs[0].id]??'host'}:{activeTab:'host'})};
}
/** Discussion is presentation history; changing it does not change a work's proposal basis. */
function adviceConfig(config:Record<string,any>,stored=false):Record<string,any>{
 if(!config.openingWorkshop)return config;
 const {discussion,discussions,activeDesignId,activeTab,workModes,emptyRequest,...selection}=config.openingWorkshop;
 // Attachment contents still invalidate a proposal, without copying megabytes
 // into its JSON-text identity or sending that binary data to a text model.
 const designs=selection.designs?.map((d:any)=>typeof d.customImage==='string'?{...d,customImage:stored&&d.customImage.startsWith('embedded-raster:')?d.customImage:globalThis.SoulOpeningWorkshopImage.identity(d.customImage)}:d);
 return {...config,openingWorkshop:{...selection,...(designs?{designs}:{})}};
}
export function workshopAdviceConfig(config:Record<string,any>):Record<string,any>{return adviceConfig(config);}
/** Old bases may contain the selected-work marker; it is never a gameplay change. */
export function workshopAdviceMatches(config:Record<string,any>,base:unknown):boolean {
 if(typeof base!=='string')return false;try{return jsonEqual(workshopAdviceConfig(config),adviceConfig(JSON.parse(base),true));}catch{return false;}
}

export function retainWorkshopAdvice(config:Record<string,any>,designId:string,base:string,input:string,result:any):Record<string,any>{
 if(!workshopAdviceMatches(config,base))throw Error('作品或人物设定已改变，原答复保留，请先处理原任务');
 return {...config,openingWorkshop:withWorkshopDiscussion(config.openingWorkshop,designId,rememberWorkshopAdvice(workshopDiscussion(config.openingWorkshop,designId),base,input,result,designId))};
}

/** The caller rechecks the proposal on the server; this only updates the editing draft. */
export function applyWorkshopProposal(config:Record<string,any>,designId:string,proposal:Record<string,any>,checked:any,adopted:boolean):Record<string,any>{
 if(proposal.designId!==designId||!workshopAdviceMatches(config,proposal.base))throw Error('草稿已改变，请基于当前设定继续讨论');
 if(checked.mode!=='proposal'||!checked.design)throw Error('这份候选尚需完善');
 if(adopted&&config.difficulty!=='unlimited')throw Error('请先开启无限点数，再采用作品');
 const s=config.openingWorkshop,work=s.designs.find((d:any)=>d.id===designId);if(!work)throw Error('原作品已移除');
 const discussion=workshopDiscussion(s,designId),selection=withWorkshopDiscussion(s,designId,{request:discussion.request??'',exchanges:discussion.exchanges??[]});
 const design={...structuredClone(checked.design),id:work.id,category:work.category,recipient:work.recipient,placement:work.placement,quantity:work.quantity,adopted,...(work.customImage?{customImage:work.customImage}:{})};
 return {...config,openingWorkshop:{...selection,designs:s.designs.map((d:any)=>d.id===designId?design:d)}};
}

export function rememberWorkshopAdvice(previous:Record<string,any>,base:string,input:string,result:any,designId:string){
 if(!result||!['question','proposal'].includes(result.mode)||typeof result.reply!=='string'||!result.reply.trim()||result.reply.length>2000||result.mode==='proposal'&&(!result.design||typeof result.design!=='object'))throw Error('作品候选答复不完整');
 const next={request:previous.request?.trim()===input?'':previous.request??'',exchanges:[...(previous.exchanges??[]),{input,reply:result.reply}],...(result.mode==='proposal'?{proposal:{base,reply:result.reply,design:structuredClone(result.design),designId}}:previous.proposal?{proposal:previous.proposal}:{})};
 if(next.exchanges.length>20)throw Error('作品讨论已达到20轮，请先处理现有候选');
 return next;
}
