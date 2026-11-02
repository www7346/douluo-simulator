export interface OpeningEditorScope {worldId:string;sessionId:number}
export type OpeningSide='buyer'|'captive';
export interface OpeningSoulEditRequest extends OpeningEditorScope {
 version:1;requestId:string;side:OpeningSide;souls:true;activeSoul:0;
 returnRing?:{side:OpeningSide;ordinal:number};
}
const editEvent='douluo:opening-soul-editor',returnEvent='douluo:opening-soul-editor-return';
const side=(s:any):s is OpeningSide=>s==='buyer'||s==='captive';
export function isOpeningSoulEditRequest(v:any):v is OpeningSoulEditRequest {
 return !!v&&v.version===1&&typeof v.worldId==='string'&&!!v.worldId&&Number.isSafeInteger(v.sessionId)&&typeof v.requestId==='string'&&!!v.requestId&&side(v.side)&&v.souls===true&&v.activeSoul===0&&(!v.returnRing||side(v.returnRing.side)&&v.returnRing.side===v.side&&Number.isSafeInteger(v.returnRing.ordinal)&&v.returnRing.ordinal>=1&&v.returnRing.ordinal<=9);
}
export function openingEditorScopeMatches(request:OpeningSoulEditRequest,scope:OpeningEditorScope){return request.worldId===scope.worldId&&request.sessionId===scope.sessionId;}
export function createOpeningSoulEditRequest(scope:OpeningEditorScope,selectedSide:OpeningSide,ordinal?:number):OpeningSoulEditRequest {
 const request:OpeningSoulEditRequest={version:1,...scope,requestId:crypto.randomUUID(),side:selectedSide,souls:true,activeSoul:0,...(ordinal===undefined?{}:{returnRing:{side:selectedSide,ordinal}})};
 if(!isOpeningSoulEditRequest(request))throw Error('请选择当前人物的武魂与魂环');return request;
}
export function openingActorSoulEditor(request:OpeningSoulEditRequest,scope:OpeningEditorScope,actors:any){
 if(!isOpeningSoulEditRequest(request)||!openingEditorScopeMatches(request,scope))return null;
 const actor=actors?.[request.side];return actor?{side:request.side,actor,souls:true,returnRequest:request}:null;
}
function subscribe(surface:EventTarget,name:string,listener:(request:OpeningSoulEditRequest)=>void){
 const handler=(event:Event)=>{const value=(event as CustomEvent).detail;if(isOpeningSoulEditRequest(value))listener(structuredClone(value));};surface.addEventListener(name,handler);return()=>surface.removeEventListener(name,handler);
}
export function observeOpeningSoulEdit(surface:EventTarget,listener:(request:OpeningSoulEditRequest)=>void){return subscribe(surface,editEvent,listener);}
export function observeOpeningSoulReturn(surface:EventTarget,listener:(request:OpeningSoulEditRequest)=>void){return subscribe(surface,returnEvent,listener);}
export function requestOpeningSoulEdit(request:OpeningSoulEditRequest,surface:EventTarget=window){if(!isOpeningSoulEditRequest(request))throw Error('武魂编辑目标不完整');surface.dispatchEvent(new CustomEvent(editEvent,{detail:structuredClone(request)}));}
export function finishOpeningSoulEdit(request:OpeningSoulEditRequest,surface:EventTarget=window){if(isOpeningSoulEditRequest(request))surface.dispatchEvent(new CustomEvent(returnEvent,{detail:structuredClone(request)}));}
