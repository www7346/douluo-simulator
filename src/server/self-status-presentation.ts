import {rules} from '../rules';
import {custodyPresentation} from './custody-presentation';

/** Current room controls reuse the normal command preflight, never inferred escape rights. */
function currentRoomPresentation(state:any,id:string){
 const position=rules.actions.positionOf(state,id);
 if(position.kind!=='location'||!position.sceneId)return null;
 const facility=(state.世界?.custody?.facilities??[]).find((f:any)=>f.locationId===position.locationId&&f.cells.some((c:any)=>c.spaceId===position.sceneId));
 if(!facility)return null;
 const cell=facility.cells.find((c:any)=>c.spaceId===position.sceneId),requests:any[]=[];
 if(cell.locked&&cell.condition>0&&facility.operatorIds.includes(id))requests.push({id:'room-open',label:'打开房门',payload:{type:'set-custody-cell-door',facilityId:facility.id,cellId:cell.id,locked:false}});
 requests.push({id:'room-leave',label:'返回公共通道',payload:{type:'visit-custody-cell',facilityId:facility.id,cellId:''}});
 const actions=requests.map(action=>{try{const quote=rules.world.previewIntent(state,action.payload);return {...action,command:'world.intent',available:quote.available!==false,reason:quote.reason??''};}catch(error){return {...action,command:'world.intent',available:false,reason:(error as Error).message};}});
 return {name:facility.name+' · 第'+(facility.cells.indexOf(cell)+1)+'房',actions};
}

/** Existing action choices, projected beside the player's current status. */
export function selfStatusPresentation(state:any){
 const id=state.角色?.主控单位ID;
 if(!id||!state.人物?.列表?.[id])return null;
 const statuses=rules.combat.listStatusViews(state,id),held=rules.world.activeCaptivity(state,id),seal=rules.sealing.active(state,id);
 const choices=seal?[]:held?rules.world.escapeOptions(state,id).map((choice:any,index:number)=>({id:`custody:${index}`,label:choice.label,command:'world.escape-captivity',payload:{statusId:choice.statusId}})):
  rules.controls.breakable(state,id).map((status:any)=>({id:status.id,label:`挣脱${statuses.find((s:any)=>s.instanceId===status.id)?.name??'束缚'}`,command:'world.intent',payload:{type:'break-restraint',statusId:status.id}}));
 const contained=seal?custodyPresentation(state,{scope:'person',selectedPersonId:id}):null;
 return {room:currentRoomPresentation(state,id),label:seal?'封神台内':held?'被关押':statuses.length?'当前状态':'自由行动',statuses,choices,custodianId:held?.custodianId??null,sealed:contained?.sealed??null,conversationTargets:contained?.conversationTargets??[],inBattle:!!rules.actions.battleOf(state,id)};
}
