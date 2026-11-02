import {rules} from '../rules';
import {playerCopy} from '../runtime/player-copy';
import {CloudError} from '../cloud/protocol';
import {captivityFacts} from '../runtime/story-captivity';
import {communicationAvailability} from '../shared/story-communication';
import {isManagedResident} from '../runtime/resident-access';

const SCOPES=['index','entry','person','bindings','placement','cooperation','disposition','control','facilities','sealing','rescue','routes','social'];
const involves=(row:any,id:string)=>[row.personId,row.targetId,row.leaderId,row.memberId,row.executorId,row.donorId,row.recipientId].includes(id);
function presentSealDevices(state:any,viewer:string,selectedPersonId?:string){
 const facts=rules.sealing.facts(state,viewer),position=rules.actions.positionOf(state,viewer),self=selectedPersonId===undefined||selectedPersonId===viewer?facts.self:null,selectedSeal=selectedPersonId?rules.sealing.active(state,selectedPersonId):null;
 const devices=facts.devices.filter((device:any)=>device.canControl&&rules.abilities.hash(device.position)===rules.abilities.hash(position)&&(!selectedPersonId||selectedPersonId===viewer||!device.sealed||device.itemId===selectedSeal?.itemId));
 return {...facts,self,devices,permissions:facts.permissions.filter((permission:any)=>!selectedPersonId||selectedPersonId===viewer||permission.targetId===selectedPersonId)};
}
/** Management follows actual custody, worn equipment and a visible seal body, never a soul or background name. */
export function personCustodyEntry(state:any,personId:string,viewer=state.角色.主控单位ID){
 const person=state.人物?.列表?.[personId];if(!person)return {personId,available:false};
 const self=personId===viewer,seal=rules.sealing.active(state,personId),visible=self||isManagedResident(state,personId,viewer)||Boolean(seal&&rules.sealing.canObserveContained(state,viewer,personId))||rules.actions.communicationColocated(state,viewer,personId)&&rules.actions.perception(state,viewer,personId,'vision');
 const record=rules.custody.active(state,personId),bindings=visible&&rules.custody.attached(state,personId).length>0,sealing=presentSealDevices(state,viewer,personId),hasSealing=Boolean(self&&seal||sealing.devices.length&&(self||visible||record?.custodianId===viewer||seal?.operatorId===viewer));
 const held=record&&(self||record.custodianId===viewer&&(visible||hasSealing))?{id:record.id,personId,personName:person.name,custodianId:record.custodianId,arrangement:structuredClone(record.arrangement)}:null;
 const canInitiate=!self&&visible&&person.status!=='dead',available=Boolean(held||bindings||hasSealing||canInitiate);
 if(!available)return {personId,available:false};
 return {personId,personName:person.name,self,available,held,bindings,hasSealing,canInitiate,kind:self?'self':held?'held':hasSealing?'sealing':bindings?'bindings':'available',label:self?'我的处境':hasSealing?'封神台内':held?'被关押':bindings?'佩戴拘束器':'人物安排'};
}
/** Read-only views of existing records. Each workspace fetches only its current subject. */
export function custodyPresentation(state:any,input:Record<string,any>):any{
 const viewer=state.角色.主控单位ID,scope=input.scope,id=input.selectedPersonId;
 if(!SCOPES.includes(scope)||id!==undefined&&typeof id!=='string')throw new CloudError('invalid-query','请选择囚禁页面与人物');
 const summary=()=>rules.custody.facts(state,viewer,{summary:true});
 const nearby=()=>Object.values(state.人物.列表).filter((p:any)=>p.id!==viewer&&rules.actions.colocated(state,viewer,p.id)&&rules.actions.perception(state,viewer,p.id)).map((p:any)=>({id:p.id,name:p.name}));
 const social=()=>({viewerId:viewer,nearby:nearby()});
 const conversationTargets=()=>Object.values(state.人物.列表).filter((p:any)=>p.id!==viewer).flatMap((p:any)=>{const communication=communicationAvailability(state,p.id);return communication.available&&communication.mode==='in-person'&&rules.actions.perception(state,viewer,p.id)?[{id:p.id,name:p.name}]:[];});
 const logistics=(destinations=false)=>rules.logistics.facts(state,viewer,{includeDestinations:destinations});
 const local=(personId:string)=>personId===viewer||isManagedResident(state,personId,viewer)||rules.actions.colocated(state,viewer,personId)&&rules.actions.perception(state,viewer,personId);
 const related=()=>({trades:rules.custodyMarket.facts(state,viewer),auctions:rules.commerceAuction.facts(state,viewer,{includeCatalog:false,includeItemDetails:false}).lots.filter((r:any)=>['person','loaded-seal'].includes(r.assetKind)),controlled:rules.world.fieldControlOptions(state,viewer,{summaryOnly:true,includeDestinations:false,...(id?{selectedExecutorId:id}:{})})});
 if(scope==='entry'){
  if(typeof id!=='string')throw new CloudError('invalid-query','请选择要查看的人物');const entry=personCustodyEntry(state,id,viewer);if(entry.available&&entry.kind!=='available')return entry;
  const prior=custodyPresentation(state,{scope:'index'}).people.find((person:any)=>person.personId===id);return prior?{...prior,available:true}:entry;
 }
 if(scope==='index'){
  const base=summary(),selfSeal=rules.sealing.active(state,viewer),selfHeld=base.held.some((r:any)=>r.personId===viewer);
  const people=base.held.map((r:any)=>({...r,self:r.personId===viewer,kind:r.personId===viewer?'self':'held',label:r.personId===viewer?'我的处境':'被关押'}));
  if((selfSeal||rules.custody.attached(state,viewer).length)&&!selfHeld)people.unshift({personId:viewer,personName:state.人物.列表[viewer].name,self:true,kind:'self',label:'我的处境'});
  for(const d of base.defeats)if(!people.some((p:any)=>p.personId===d.targetId))people.push({personId:d.targetId,personName:d.targetName,self:d.targetId===viewer,kind:'defeat',label:'待处置'});
  const add=(personId:string,kind:string,label:string)=>{if(state.人物.列表[personId]&&!people.some((r:any)=>r.personId===personId))people.push({personId,personName:state.人物.列表[personId].name,self:personId===viewer,kind,label});};
  const candidates=new Set<string>([viewer,...Object.values(rules.custody.table(state).byPerson).map((record:any)=>record.personId),...rules.sealing.table(state).records.filter((record:any)=>['sealed','confined'].includes(record.status)).map((record:any)=>record.targetId),...Object.values(state.物品.实例).flatMap((item:any)=>item.attachment?.wearerId?[item.attachment.wearerId]:[])]);
  for(const personId of candidates){const entry=personCustodyEntry(state,personId,viewer);if(entry.available)add(personId,entry.kind!,entry.label!);}
  for(const p of base.permissionRequests.filter((p:any)=>p.status==='pending')){const personId=p.wearerId===viewer?p.operatorId:p.wearerId;if(local(personId))add(personId,'request','装配请求');}
  for(const p of base.permissions){const personId=p.wearerId===viewer?p.operatorId:p.wearerId;if(local(personId))add(personId,'permission','待装配');}
  const links=related();for(const p of links.controlled)add(p.executorId,'controlled','受控');
  for(const p of links.trades)add(p.personId,'trade',p.status==='pending'?'交易待办':'交易记录');
  for(const p of links.auctions)if(!people.some((r:any)=>r.personId===p.personId))people.push({personId:p.personId,personName:playerCopy(p.name),self:p.personId===viewer,kind:'auction',label:p.status==='open'?'竞拍中':'拍卖记录'});
  people.sort((a:any,b:any)=>Number(b.self)-Number(a.self));
  const seals=presentSealDevices(state,viewer);return {viewerId:viewer,people,hasSealing:Boolean(seals.self||seals.devices.length),pendingCount:base.defeats.length+base.permissionRequests.filter((p:any)=>p.canRespond).length};
 }
 if(scope==='sealing'){if(id!==undefined&&!personCustodyEntry(state,id,viewer).available)throw new CloudError('invalid-query','这位人物当前没有可查看的封神台');return {sealing:{...presentSealDevices(state,viewer,id),conversationTargets:conversationTargets()}};}
 if(scope==='routes')return {destinations:logistics(true)?.destinations??[]};
 if(scope==='facilities')return {...summary(),logistics:logistics()};
 if(scope==='rescue')return {rescues:rules.rescue.facts(state,viewer),social:rules.social.facts(state,viewer,{includeSpeech:false}),logistics:logistics()};
 if(scope==='social'){
  const result=rules.social.facts(state,viewer);
  return {social:{...result,...(id?{pendingRelations:result.pendingRelations.filter((r:any)=>[r.playerId,r.personId].includes(id)),speech:result.speech.filter((r:any)=>[r.speakerId,r.listenerId].includes(id))}:{})},logistics:logistics()};
 }
 if(typeof id!=='string'||!state.人物.列表[id])throw new CloudError('invalid-query','请选择当前列表中的人物');
 const entry=personCustodyEntry(state,id,viewer),base=summary(),held=base.held.find((r:any)=>r.personId===id)??entry.held,defeat=base.defeats.find((r:any)=>r.targetId===id),request=local(id)&&base.permissionRequests.some((r:any)=>r.status==='pending'&&[r.wearerId,r.operatorId].includes(id)),permission=local(id)&&base.permissions.some((r:any)=>[r.wearerId,r.operatorId].includes(id));
 const links=related(),controlled=links.controlled.some((r:any)=>r.executorId===id),trade=[...links.trades,...links.auctions].some((r:any)=>r.personId===id);
 const ordinary=scope==='cooperation'&&state.人物.列表[id];
 if(typeof id!=='string'||!state.人物.列表[id]||!entry.available&&!held&&!defeat&&!request&&!permission&&!controlled&&!trade&&!ordinary)throw new CloudError('invalid-query','这位人物当前不在可查看的列表中，请重新选择');
 const person=state.人物.列表[id],self=id===viewer;
 if(scope==='person'){
  const unit=state.战斗单位.列表[person.combatantId??id],position=rules.actions.positionOf(state,id),containment=rules.sealing.active(state,id),sealing=containment?rules.sealing.facts(state,viewer):null;
  const device=containment&&entry.hasSealing?presentSealDevices(state,viewer,id).devices.find((d:any)=>d.itemId===containment.itemId):null;
  const sealed=self?sealing?.self:device?.sealed?{...device.sealed,itemId:device.itemId}:sealing?.devices.find((d:any)=>d.sealed?.targetId===id)?.sealed;
  const visible=local(id)||Boolean(containment&&rules.sealing.canObserveContained(state,viewer,id)),sections=self&&sealed?(sealed.mode==='awake'?['bindings']:[]):self?[...(entry.hasSealing?['sealing']:[]),'bindings','placement','cooperation']:held?[...(entry.hasSealing?['sealing']:[]),'bindings','placement','cooperation','disposition']:entry.bindings||request||permission||controlled?[...(entry.hasSealing?['sealing']:[]),'bindings','cooperation',...(trade?['disposition']:[])]:entry.hasSealing?['sealing',...(entry.canInitiate?['bindings']:[])]:entry.canInitiate?['bindings']:['disposition'];
  return {personId:id,canInitiate:entry.canInitiate,name:!visible?playerCopy(links.auctions.find((r:any)=>r.personId===id)?.name??person.name):person.name,self,sections,custodianName:held?state.人物.列表[held.custodianId]?.name:null,locationName:sealed?'封神台内':!visible?'目前不在眼前':position.kind==='transit'?'道路途中':state.地图.地点[position.locationId]?.name??'当前所在处',room:visible&&position.sceneId&&!sealed?'独立房间':null,power:visible?rules.controls.powerFacts(state,id):null,resources:visible?unit?.资源??null:null,defeat:defeat??null,devices:base.devices,captivity:self&&!sealed?captivityFacts(state):null,sealed:sealed??null,...(self&&sealed?.mode==='awake'?{conversationTargets:conversationTargets()}:{})};
 }
 if(scope==='bindings'){
  const detail=held?rules.custody.facts(state,viewer,{selectedOnly:true,selectedPersonId:id}):base;
  const availableDevices=!self&&local(id)?detail.devices.map((d:any)=>{let reason='',requestReason='';try{rules.custody.attachQuote(state,{actorId:viewer,targetId:id,itemId:d.id});}catch(e){reason=(e as Error).message;}try{rules.custody.permissionRequestQuote(state,viewer,id,d.id);if(detail.permissionRequests.some((r:any)=>r.operatorId===viewer&&r.wearerId===id&&r.status==='pending'&&r.itemId===d.id))throw Error('已经提出请求，等待回应');}catch(e){requestReason=(e as Error).message;}return {itemId:d.id,name:d.name,available:!reason,reason,canRequest:!requestReason,requestReason};}):[];
  return {...detail,viewerId:viewer,selectedPersonId:id,hasControl:controlled,availableDevices,held:detail.held.filter((r:any)=>r.personId===id),permissionRequests:detail.permissionRequests.filter((r:any)=>[r.wearerId,r.operatorId].includes(id)),permissions:detail.permissions.filter((r:any)=>[r.wearerId,r.operatorId].includes(id)),brokenDevices:self?detail.brokenDevices:[]};
 }
 if(scope==='placement'){const places=logistics();return {...base,held:base.held.filter((r:any)=>r.personId===id),logistics:{...places,escorts:places?.escorts.filter((r:any)=>r.personIds.includes(id))??[]}};}
 if(scope==='cooperation')return {logistics:{viewerId:viewer},social:social(),selectedPersonId:id,cooperations:rules.cooperation.facts(state,viewer).filter((r:any)=>involves(r,id)),preparations:rules.preparations.facts(state,viewer).filter((r:any)=>r.memberId===id),preparationOptions:rules.preparations.options(state,viewer,{memberId:id}),gifts:rules.gifts.facts(state,viewer).filter((r:any)=>involves(r,id))};
 if(scope==='disposition'){
  const record=held?rules.custody.active(state,id):null,barrier=record&&rules.logistics.barrier(state,record),canManageRelease=record?.custodianId===viewer;
  const canRelease=canManageRelease&&!barrier&&rules.custody.facts(state,viewer,{selectedOnly:true,selectedPersonId:id}).held.find((r:any)=>r.personId===id)?.canRelease;
  return {viewerId:viewer,selectedPersonId:id,held:held?[held]:[],tradeOptions:rules.custodyMarket.options(state,viewer).filter((r:any)=>r.personId===id),trades:links.trades.filter((r:any)=>r.personId===id),auctions:links.auctions.filter((r:any)=>r.personId===id),auctionVenue:rules.custodyAuction.VENUE,canManageRelease,canRelease:Boolean(canRelease),releaseReason:barrier?'房门仍锁着，请先到“安置”中开门。':canManageRelease&&!canRelease?'当前无法操作，请先处理自身的行动限制。':''};
 }
 return {selectedPersonId:id,logistics:{viewerId:viewer},social:social(),fieldControlOptions:links.controlled,fieldOrders:rules.fieldControl.facts(state,viewer).filter((r:any)=>r.executorId===id),gifts:rules.gifts.facts(state,viewer).filter((r:any)=>involves(r,id))};
}
