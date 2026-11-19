import {rules} from '../rules';
import {custodyPresentation} from './custody-presentation';

/** Current room controls reuse the normal command preflight, never inferred escape rights. */
function currentRoomPresentation(state:any,id:string,held:boolean,doorEscape:any){
 const room=rules.logistics.currentRoom(state,id);
 if(!room)return null;
 const {facility,cell}=room,requests:any[]=[];
 if(cell.locked&&cell.condition>0){
  const open={type:'set-custody-cell-door',facilityId:facility.id,cellId:cell.id,locked:false};
  if(facility.operatorIds.includes(id)&&!held)requests.push({id:'room-open',label:'打开房门',payload:open});
  for(const operator of facility.operatorIds){
   if(operator===id||!rules.influence.authority(state,id,operator,'物品').available)continue;
   requests.push({id:'room-open:'+operator,label:`命令${state.人物.列表[operator]?.name??'看管人'}开门`,payload:{type:'issue-field-control',executorId:operator,action:open}});
  }
  if(!held)requests.push({id:'room-break',label:'破坏房门 · 10分钟',payload:{type:'break-custody-cell-door',facilityId:facility.id,cellId:cell.id}});
 }
 requests.push({id:'room-leave',label:'返回公共通道',payload:{type:'visit-custody-cell',facilityId:facility.id,cellId:''}});
 const actions=requests.map(action=>{try{const quote=rules.world.previewIntent(state,action.payload);return {...action,command:'world.intent',available:quote.available!==false,reason:quote.reason??''};}catch(error){return {...action,command:'world.intent',available:false,reason:(error as Error).message};}});
 if(doorEscape?.payload.statusId===`cell-door:${facility.id}:${cell.id}`)actions.unshift({...doorEscape,label:'破坏房门 · 10分钟',available:true});
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
 const doorEscape=choices.find((choice:any)=>choice.payload.statusId?.startsWith('cell-door:'));
 const room=currentRoomPresentation(state,id,!!held,doorEscape);
 const hasRoomEscape=room?.actions.some(action=>action.id===doorEscape?.id);
 return {room,label:seal?'封神台内':held?'被关押':statuses.length?'当前状态':'自由行动',statuses,choices:hasRoomEscape?choices.filter((choice:any)=>choice!==doorEscape):choices,custodianId:held?.custodianId??null,sealed:contained?.sealed??null,conversationTargets:contained?.conversationTargets??[],inBattle:!!rules.actions.battleOf(state,id)};
}
