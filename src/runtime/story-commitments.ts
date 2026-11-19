import {recordGoodwill} from './social-goodwill';
import {contactStoryPerson} from './story-communication';
import {soulContact} from '../shared/story-communication';
import {meetStoryPerson} from './story-people';
import {pendingStoryCommitments,deferredStoryCommitments,commitmentExpired,worldMinute} from '../shared/story-commitments';
import {rules} from '../rules';
import {ensureStoryNpcMechanics} from './story-npc-mechanics';

export type CommitmentStatus='pending'|'accepted'|'rejected'|'completed'|'expired'|'cancelled'|'ended';
const terminal=['rejected','completed','expired','cancelled','ended'];
export const RELATIONSHIP_LABELS={friends:'朋友',partners:'伴侣',kin:'亲属',mentor:'师徒',comrades:'同门',school:'师生',known:'熟识',employment:'雇佣',hierarchy:'上下级',hostile:'仇敌'} as const;
export function relationshipBetween(state:any,leftId:string,rightId:string){return rules.social.relationshipBetween(state,leftId,rightId);}
export function personRelationship(state:any,personId:string){return relationshipBetween(state,state.角色.主控单位ID,personId);}
export function personCommitments(state:any,personId:string){
 const mainId=state.角色.主控单位ID;if(personId===mainId)return [];
 const own=(state.人物?.列表?.[personId]?.扩展?.社交约定??[]).filter((r:any)=>r.playerId===mainId),reverse=(state.人物?.列表?.[mainId]?.扩展?.社交约定??[]).filter((r:any)=>['relationship','contact'].includes(r.kind)&&r.playerId===personId&&r.personId===mainId);
 return [...own,...reverse];
}
export function commitmentView(state:any,record:any){
 const view=structuredClone(record);
 if(!terminal.includes(view.status)&&commitmentExpired(state,view)){view.status='expired';view.expiryReason='当前世界时间已超过约定期限';}
 return view;
}
/** Completed interaction facts stay available even after narrative messages leave the window. */
export function recentEndedCommitments(state:any,personId:string){
 return personCommitments(state,personId).map((r:any)=>commitmentView(state,r))
  .filter((r:any)=>terminal.includes(r.status))
  .map((record:any,index:number)=>({record,index}))
  .sort((a:any,b:any)=>(b.record.events.at(-1)?.revision??-1)-(a.record.events.at(-1)?.revision??-1)||b.index-a.index)
  .slice(0,8).map((entry:any)=>entry.record);
}
function all(state:any):any[]{return Object.values(state.人物?.列表??{}).flatMap((p:any)=>personCommitments(state,p.id));}
function event(state:any,record:any,status:CommitmentStatus,sourceId:string,detail:Record<string,any>={}){
 rules.social.appendCommitmentEvent(state,record,status,sourceId,detail);
}
function needsExpiration(state:any,record:any){return !record.origin?.control&&!terminal.includes(record.status)&&commitmentExpired(state,record);}
export function hasExpiringStoryCommitments(state:any){return all(state).some(record=>needsExpiration(state,record));}
export function expireStoryCommitments(state:any){
 let changed=false;
 for(const record of all(state))if(needsExpiration(state,record)){
  event(state,record,'expired',`expiry:${record.id}:${record.dueDay}`,{reason:'约定期限已过，未自动付款或授予奖励'});changed=true;
 }
 return changed;
}
export function validateStoryCommitments(state:any){
 for(const person of Object.values(state.人物?.列表??{}) as any[]){
  const records=person.扩展?.社交约定;if(records===undefined)continue;
  if(!Array.isArray(records))throw Error('社交约定存档格式无效');
  if(records.filter((r:any)=>r.kind==='contact'&&r.status==='completed'&&r.playerId===state.角色.主控单位ID).length>1)throw Error('双方联络方式重复建立');
  const ids=new Set();
  for(const r of records){
   if(!r||typeof r.id!=='string'||!r.id||ids.has(r.id)||!['give-gold','give-item','realm-guest','realm-return','meeting','relationship','party','contact','hire','loot','loot-resolution'].includes(r.kind)||r.personId!==person.id||!state.人物.列表[r.playerId]||r.playerId===r.personId
    ||!['realm-return','realm-guest','relationship','party','contact','loot','loot-resolution'].includes(r.kind)&&(!Number.isSafeInteger(r.dueDay)||r.dueDay<1)||!Array.isArray(r.events)||!r.events.length)throw Error('社交约定存档条款无效');
   if(r.kind==='realm-guest'){
    const realm=rules.residentRealms.get(state,r.realmId),space=realm&&rules.interiorSpaces.get(state,realm.id);
    if(realm?.ownerId!==r.playerId||realm?.profileId!=='nine-beauties-v1'||!space?.regions.some((region:any)=>region.id===r.regionId))throw Error('入住邀请的画境或房间无效');
    const completed=r.events.find((e:any)=>e.status==='completed');
    if(completed&&!rules.interiorSpaces.table(state).events.some((e:any)=>e.type==='entered'&&e.spaceId===r.realmId&&e.unitId===r.personId&&e.sourceId===completed.sourceId&&e.member.regionId===r.regionId))throw Error('入住答复缺少实际到达记录');
   }
   if(r.kind==='loot-resolution'&&(!rules.expedition.loot.resolutions(state).some((a:any)=>a.id===r.resolutionId&&JSON.stringify(a.terms)===JSON.stringify(r.terms))||r.events.some((e:any)=>e.status==='completed'&&e.resolutionId!==r.resolutionId)))throw Error('争议分配回应缺少原条款');
   if(r.kind==='loot'&&(!rules.expedition.loot.records(state).some((a:any)=>a.id===r.allocationId&&a.dungeonId===r.dungeonId&&JSON.stringify(a.terms)===JSON.stringify(r.terms))||r.events.some((e:any)=>e.status==='completed'&&e.allocationId!==r.allocationId)))throw Error('分配确认缺少原条款');
   if(r.kind==='party'&&(!['temporary','long-term'].includes(r.membership)||(r.membership==='temporary'?!rules.expedition.DUNGEON_PROFILES[r.dungeonId]:r.dungeonId!==null)))throw Error('同行约定期限或目的地无效');
   if(r.kind==='hire'&&(!rules.expedition.DUNGEON_PROFILES[r.dungeonId]||!state.地图.地点[r.locationId]||r.amount!==undefined||r.fee!==undefined))throw Error('本人同行询价的目的地、地点或报价阶段无效');
   if(r.kind==='give-gold'&&(!Number.isSafeInteger(r.amount)||r.amount<1))throw Error('赠款金额无效');
   if(r.kind==='give-item'&&(typeof r.itemId!=='string'||!r.itemId||typeof r.itemName!=='string'||!r.itemName||!rules.world.ITEM_TEMPLATES[r.templateId]||!Number.isSafeInteger(r.quantity)||r.quantity<1))throw Error('赠物条款无效');
   if(r.kind==='contact'&&r.channel!=='soul-device')throw Error('联络约定渠道无效');
   if(r.kind==='relationship'&&!Object.hasOwn(RELATIONSHIP_LABELS,r.relationship))throw Error('关系提议类型无效');
   if(r.kind==='meeting'){
    checkTime(r.startsAt);
    if(!state.地图.地点[r.locationId]||r.endsAt!==worldMinute(r.startsAt)+60||r.dueDay!==Math.floor(r.endsAt/1440))throw Error('邀约时间或地点无效');
   }
   ids.add(r.id);let previous='';
   for(const e of r.events){
    const opening=r.origin?.kind==='opening'&&rules.openingRelations.validOrigin(state,r.origin,r.playerId,r.personId,r.kind==='relationship'?r.relationship:undefined,r.id);
    const explicitEnding=r.origin?.kind==='explicit-ending'&&rules.social.validEnding(state,r);
    const allowed=previous===''?(opening?['completed']:explicitEnding?['ended']:['pending']):previous==='pending'?['accepted','rejected','expired','cancelled']:previous==='accepted'?['completed','expired','cancelled']:previous==='completed'&&['relationship','party'].includes(r.kind)?['ended']:[];
    if(!allowed.includes(e.status)||typeof e.sourceId!=='string'||!e.sourceId||!Number.isSafeInteger(e.time?.day)||e.time.day<1||!Number.isSafeInteger(e.revision)||e.revision<0)throw Error('社交约定存档状态转换无效');
    if(e.status==='completed'&&r.kind==='give-gold'&&e.paid!==r.amount)throw Error('社交约定完成金额不一致');
    if(e.status==='completed'&&r.kind==='give-item'&&(e.quantity!==r.quantity||typeof e.deliveredItemId!=='string'||!e.deliveredItemId))throw Error('赠物完成记录与条款不一致');
    if(e.status==='completed'&&r.kind==='contact'&&e.channel!=='soul-device')throw Error('联络完成记录无效');
    if(e.status==='completed'&&r.kind==='relationship'&&e.relationship!==r.relationship)throw Error('关系确认记录与提议不符');
    if(e.status==='ended'&&r.kind==='relationship'&&(e.relationship!==r.relationship||![r.playerId,r.personId].includes(e.endedBy)))throw Error('关系结束记录与双方不符');
    if(r.kind==='party'&&(e.status==='completed'&&e.membership!==r.membership||e.status==='ended'&&(![r.playerId,r.personId].includes(e.endedBy)||typeof e.reason!=='string'||!e.reason)))throw Error('同行加入或离队记录与双方不符');
    if(e.status==='completed'&&r.kind==='meeting'&&(e.locationId!==r.locationId||worldMinute(e.time)<worldMinute(r.startsAt)||worldMinute(e.time)>r.endsAt))throw Error('赴约记录与约定地点时间不符');previous=e.status;
   }
   if(r.kind==='hire'){
    const accepted=r.events.find((e:any)=>e.status==='accepted'),completed=r.events.find((e:any)=>e.status==='completed');
    if(accepted){
     if(!Number.isSafeInteger(accepted.fee)||accepted.fee<1||accepted.quoteId!==accepted.sourceId)throw Error('本人雇佣报价缺少有效金额或原回应来源');
     const quote=(person.扩展?.议价历史??[]).find((q:any)=>q.id===accepted.quoteId&&q.source==='personal'&&q.commitmentId===r.id&&q.playerId===r.playerId&&q.personId===r.personId&&q.dungeonId===r.dungeonId&&q.fee===accepted.fee);
     if(!quote||completed&&(completed.quoteId!==quote.id||completed.fee!==quote.fee))throw Error('本人雇佣报价缺少原询价和正式报价记录');
    }else if(completed||r.events.some((e:any)=>e.fee!==undefined||e.quoteId!==undefined))throw Error('尚未接受的询价不能登记本人报价');
   }
   if(previous!==r.status)throw Error('社交约定当前状态与历史不一致');
  }
 }
}
export function proposeGoldPromise(state:any,input:Record<string,any>,sourceId:string){
 if(all(state).some(r=>r.id===sourceId))throw Error('这项承诺编号已经使用');
 const {amount,dueDay}=input;
 if(!Number.isSafeInteger(amount)||amount<1||!Number.isSafeInteger(dueDay)||dueDay<state.世界.时间.day)throw Error('承诺须明确正整数金额和未过期的世界日编号');
 const met=contactStoryPerson(state,input.characterId);state=met.state;
 if(all(state).filter(r=>r.status==='pending').length>=3)throw Error('请先完成已有约定的回应');
 const person=state.人物.列表[met.receipt.personId];person.扩展.社交约定??=[];
 const record={id:sourceId,kind:'give-gold',playerId:state.角色.主控单位ID,personId:person.id,amount,dueDay,
  status:'pending',locationId:state.地图.当前地点ID,events:[]};
 event(state,record,'pending',sourceId,{reason:'玩家提出无附加条件的赠款承诺，等待对方回应'});
 person.扩展.社交约定.push(record);
 return {state,receipt:{type:'commitment-proposed',commitment:structuredClone(record),summary:`向${person.name}提出在第${dueDay}日结束前赠予${amount}金魂币的承诺；尚待回应，未付款。`}};
}
export function validateCommitmentResponse(value:any,record?:{kind:string}){
 if(record?.kind!=='hire')return rules.expedition.loot.validateResponse(value);
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!['accept','reason','fee'].includes(key)))throw Error('本人询价回应只能包含接受或拒绝、理由及接受时的金币报价');
 const checked=rules.expedition.loot.validateResponse({accept:value.accept,reason:value.reason});
 if(!checked.accept){if(Object.hasOwn(value,'fee'))throw Error('拒绝同行报价时请省略金额');return checked;}
 if(!Number.isSafeInteger(value.fee)||value.fee<1)throw Error('本人愿意提供同行服务时须给出正整数金币报价');
 return {...checked,fee:value.fee};
}
export function proposePersonalHireQuote(state:any,personId:string,dungeonId:string,sourceId:string){
 const playerId=state.角色.主控单位ID,availability=rules.expedition.personalHireAvailability(state,personId,dungeonId,playerId);
 if(!availability.available)throw Error(availability.reason);
 const person=state.人物.列表[personId],existing=personCommitments(state,personId).find((r:any)=>r.kind==='hire'&&r.playerId===playerId&&r.dungeonId===dungeonId&&r.locationId===state.地图.当前地点ID&&r.status==='pending'&&!commitmentExpired(state,r));
 if(existing)return {state,receipt:{type:'commitment-proposed',commitment:structuredClone(existing),summary:`已向${person.name}询问本次同行报价，仍待本人回应；尚未付款或入队。`}};
 if(all(state).some(r=>r.id===sourceId))throw Error('这次询价的原操作编号已经使用');
 if(all(state).filter(r=>r.status==='pending').length>=3)throw Error('请先完成已有约定的回应');
 const record={id:sourceId,kind:'hire',playerId,personId,dungeonId,locationId:state.地图.当前地点ID,dueDay:state.世界.时间.day,status:'pending',events:[]};
 event(state,record,'pending',sourceId,{reason:'玩家询问本次同行的金币报价，等待本人愿意报价或拒绝；尚未确定金额'});
 (person.扩展.社交约定??=[]).push(record);
 return {state,receipt:{type:'commitment-proposed',commitment:structuredClone(record),summary:`已向${person.name}询问前往${rules.expedition.DUNGEON_PROFILES[dungeonId].name}的本次同行报价，等待本人回应；没有付款或入队。`}};
}
export function proposeRealmVisit(state:any,input:Record<string,any>,sourceId:string){
 const met=meetStoryPerson(state,input.characterId);state=met.state;
 const playerId=state.角色.主控单位ID,personId=met.receipt.personId;
 const record={id:sourceId,kind:'realm-guest',playerId,personId,realmId:input.realmId,regionId:input.regionId,status:'pending',events:[]};
 const reason=rules.residentRealms.guestAvailability(state,playerId,personId,record.realmId,record.regionId);
 if(reason)throw Error(reason);
 if(personCommitments(state,personId).some((r:any)=>r.kind==='realm-guest'&&r.status==='pending'))throw Error('已有一份入住邀请等待答复');
 event(state,record,'pending',sourceId,{reason:'邀请自由入住，可自行活动、修炼或离开。'});
 (state.人物.列表[personId].扩展.社交约定??=[]).push(record);
 return {state,receipt:{type:'commitment-proposed',commitment:structuredClone(record),summary:'入住邀请已提出，等候本人决定。'}};
}
export function proposeRelationship(state:any,input:Record<string,any>,sourceId:string){
 if(!Object.hasOwn(RELATIONSHIP_LABELS,input.relationship))throw Error('请选择正式关系类型');
 if(all(state).some(r=>r.id===sourceId))throw Error('这项关系提议编号已经使用');
 const met=contactStoryPerson(state,input.characterId);state=met.state;
 if(all(state).filter(r=>r.status==='pending').length>=3)throw Error('请先完成已有约定的回应');
 const person=state.人物.列表[met.receipt.personId],existing=personRelationship(state,person.id);
 if(existing?.kind===input.relationship)throw Error('双方已经确认了这段关系');
 if(existing?.kind==='partners')throw Error('双方已有伴侣关系，不能用交友提议替代分手或关系变更');
 const record={id:sourceId,kind:'relationship',relationship:input.relationship,roles:rules.social.normalizeRoles(input.relationship,input.roles),playerId:state.角色.主控单位ID,personId:person.id,locationId:state.地图.当前地点ID,status:'pending',events:[]};
 event(state,record,'pending',sourceId,{reason:'玩家明确提出确认关系，等待对方独立回应'});person.扩展.社交约定??=[];person.扩展.社交约定.push(record);
 return {state,receipt:{type:'commitment-proposed',commitment:structuredClone(record),summary:`向${person.name}提出确认${RELATIONSHIP_LABELS[input.relationship as keyof typeof RELATIONSHIP_LABELS]}关系，尚待回应；没有改变原关系或授予其他权利。`}};
}
export function endStoryRelationship(state:any,input:Record<string,any>,sourceId:string){
 const met=contactStoryPerson(state,input.characterId);state=met.state;
 const current=personRelationship(state,met.receipt.personId);
 if(!current?.kind||current.sourceId!==input.relationshipId)throw Error('没有匹配的当前关系，不能结束旧记录或重复结束');
 const records=personCommitments(state,met.receipt.personId);let record=records.find((r:any)=>r.id===current.sourceId);
 if(!record&&current.cause==='ability-rewrite')record=rules.social.endRewrittenRelation(state,state.角色.主控单位ID,met.receipt.personId,sourceId);
 else if(record)event(state,record,'ended',sourceId,{relationship:record.relationship,endedBy:state.角色.主控单位ID,reason:'玩家明确告知对方结束关系，不要求对方同意'});
 else throw Error('当前关系缺少正式来源');
 const cancelled:string[]=[];
 for(const pending of records)if(pending.kind==='relationship'&&pending.status==='pending'){
  event(state,pending,'cancelled',sourceId,{reason:'双方关系已结束，先前尚未回应的关系提议一并撤回'});cancelled.push(pending.id);
 }
 return {state,receipt:{type:'relationship-ended',personId:met.receipt.personId,relationship:personRelationship(state,met.receipt.personId),ended:structuredClone(record),cancelledProposalIds:cancelled,summary:'这段关系已结束；不自动恢复更早的关系，也不撤销独立的财产、雇佣或赠款约定。对方情绪可描写，但不能否决结束关系。'}};
}
function checkTime(time:any){
 if(!time||!Number.isSafeInteger(time.day)||time.day<1||!Number.isSafeInteger(time.hour)||time.hour<0||time.hour>23||!Number.isSafeInteger(time.minute)||time.minute<0||time.minute>59||!Number.isSafeInteger(worldMinute(time)+60))throw Error('请明确有效的约见日期和时分');
}
export function invitationAvailability(state:any,record:any){
 const voluntary=rules.influence.voluntaryReason(state,record.personId);if(voluntary)return {available:false,reason:voluntary};
 if(record.kind==='loot-resolution')return {available:rules.expedition.loot.resolutionAvailable(state,record),reason:'这项待分收获或方案已经变化，需要重新确认'};
 if(record.kind==='loot')return {available:rules.expedition.loot.available(state,record),reason:'分配版本或成员已经变化，需要本人重新确认'};
 if(record.kind==='contact'&&soulContact(state,record.personId))return {available:false,reason:'双方已经交换联络方式'};
 if(record.kind==='realm-guest'){const reason=rules.residentRealms.guestAvailability(state,record.playerId,record.personId,record.realmId,record.regionId);return {available:!reason,reason};}
 if(record.guestRealmId){
  if(!rules.residentRealms.guestRecord(state,record.guestRealmId,record.personId))return {available:false,reason:'住客已离开原房间'};
  if(record.kind==='realm-return')return {available:rules.world.partyMembers(state).some((m:any)=>m.personId===record.personId),reason:'原同行约定已经结束'};
 }
 if(record.kind==='party'&&record.guestRealmId)return rules.world.partyJoinAvailability(state,record.personId,record.membership,true);
 if(record.kind==='party')return rules.world.partyJoinAvailability(state,record.personId,record.membership,!!soulContact(state,record.personId));
 if(record.kind==='hire')return rules.expedition.personalHireAvailability(state,record.personId,record.dungeonId,record.playerId);
 if(record.kind!=='meeting')return {available:true,reason:''};
 const start=worldMinute(record.startsAt);
 for(const p of Object.values(state.人物.列表) as any[])for(const other of p.扩展?.社交约定??[]){
  if(other.id===record.id||other.kind!=='meeting'||other.status!=='accepted'||commitmentExpired(state,other))continue;
  if((other.personId===record.personId||other.playerId===record.playerId)&&worldMinute(other.startsAt)<=record.endsAt&&other.endsAt>=start)return {available:false,reason:'双方已有重叠的约见时间，不能重复应约'};
 }
 return rules.world.appointmentTravelAvailability(state,record);
}
export function proposeInvitation(state:any,input:Record<string,any>,sourceId:string){
 const startsAt={day:input.day,hour:input.hour,minute:input.minute};checkTime(startsAt);
 if(worldMinute(startsAt)<worldMinute(state.世界.时间))throw Error('不能邀请对方赴过去的约');
 if(!state.地图.地点[input.locationId]||!rules.world.isLocationKnown(state,input.locationId))throw Error('请选择已经知道的约见地点');
 if(all(state).some(r=>r.id===sourceId))throw Error('这项邀约编号已经使用');
 const met=contactStoryPerson(state,input.characterId);state=met.state;
 if(all(state).filter(r=>r.status==='pending').length>=3)throw Error('请先完成已有约定的回应');
 const person=state.人物.列表[met.receipt.personId],endsAt=worldMinute(startsAt)+60;
 person.扩展.社交约定??=[];
 const record={id:sourceId,kind:'meeting',playerId:state.角色.主控单位ID,personId:person.id,locationId:input.locationId,startsAt,endsAt,dueDay:Math.floor(endsAt/1440),status:'pending',events:[]};
 event(state,record,'pending',sourceId,{reason:'玩家提出见面邀约，等待人物回应'});person.扩展.社交约定.push(record);
 return {state,receipt:{type:'commitment-proposed',commitment:structuredClone(record),summary:`邀请${person.name}在第${startsAt.day}日${startsAt.hour}:${String(startsAt.minute).padStart(2,'0')}于${state.地图.地点[input.locationId].name}见面，到场窗口一小时；尚待回应，双方位置未改变。`}};
}
export function respondStoryCommitment(state:any,input:Record<string,any>,sourceId:string){
 const ledger=state.扩展?.story;
 const deferred=input.deferred===true;
 if(!deferred&&(ledger?.branchId!==input.branchId||ledger.active?.number!==input.turn))throw Error('约定回应的分支或回合已经变化');
 const record=(deferred?deferredStoryCommitments(state):pendingStoryCommitments(state)).find(r=>r.id===input.commitmentId);
 if(!record)throw Error('这项约定已回应、过期或不属于本回合');
 rules.influence.assertVoluntary(state,record.personId);
 let response=validateCommitmentResponse(input.response,record);
 const availability=invitationAvailability(state,record);
 if(response.accept&&!availability.available&&!['loot','loot-resolution'].includes(record.kind))response={accept:false,reason:availability.reason};
 const group=!deferred&&ledger.active.partyChat&&['loot','loot-resolution'].includes(record.kind)&&(ledger.partyMessages??[]).some((m:any)=>m.source.turn===input.turn&&m.proposals?.some((p:any)=>p.commitmentId===record.id));
 if(deferred){const remote=!rules.actions.communicationColocated(state,record.personId,record.playerId);if(remote&&!soulContact(state,record.personId))throw Error('双方当前没有可接通的回应通道');rules.social.communicate(state,record.personId,record.playerId,remote);}
 else{const met=contactStoryPerson(state,record.personId,group?{party:true}:undefined);state=met.state;}
 const current=personCommitments(state,record.personId).find((r:any)=>r.id===record.id)!;
 let lootDelivery:any=null;
 if(['loot','loot-resolution'].includes(current.kind))lootDelivery=rules.expedition.loot.settleResponse(state,current,response,sourceId).lootDelivery;
 else event(state,current,response.accept?'accepted':'rejected',sourceId,{reason:response.reason,...(current.kind==='hire'&&response.accept?{fee:response.fee,quoteId:sourceId}:{})});
 if(response.accept&&current.guestRealmId){
  rules.residentRealms.execute(state,{type:'end-realm-visit',realmId:current.guestRealmId,actorId:current.personId,targetId:current.personId},sourceId+':guest-return');
  if(current.kind==='realm-return')event(state,current,'completed',sourceId,{reason:response.reason});
 }
 if(response.accept&&current.kind==='realm-guest'){rules.residentRealms.welcomeGuest(state,current,sourceId);event(state,current,'completed',sourceId,{reason:response.reason});}
 if(response.accept&&current.kind==='hire'){
  const offered=rules.expedition.offerPersonalCompanion(state,{actorId:current.playerId,personId:current.personId,commitmentId:current.id,fee:response.fee},sourceId);state=offered.state;
  const quoted=personCommitments(state,current.personId).find((r:any)=>r.id===current.id)!;
  event(state,quoted,'completed',sourceId,{reason:'本人已提供本次同行报价，等待玩家另行接受并支付；尚未入队',fee:response.fee,quoteId:sourceId});
 }
 if(response.accept&&current.kind==='meeting')rules.world.createAppointmentPlan(state,current,response.reason,sourceId,input.branchId??ledger.branchId);
 if(response.accept&&current.kind==='contact')event(state,current,'completed',sourceId,{reason:response.reason,channel:'soul-device'});
 if(response.accept&&current.kind==='relationship')event(state,current,'completed',sourceId,{relationship:current.relationship,reason:'双方明确同意，关系已确认；不附带财产、同行或其他承诺'});
 if(response.accept&&current.kind==='party'){
  const previous=rules.world.partyMembers(state).find((p:any)=>p.personId===current.personId);
  if(previous)rules.world.endPartyMembership(state,current.personId,previous.membershipId,sourceId,state.角色.主控单位ID,'双方接受长期同行，新约定替代原临时约定；身份与经历不变');
  const person=state.人物.列表[current.personId];
  if(rules.world.NPC_ARCHETYPES[person.扩展?.archetypeId]?.full){
   if(person.locationId===state.地图.当前地点ID)state=ensureStoryNpcMechanics(state,current.personId,sourceId);
   if(!state.战斗单位.列表[current.personId])state=rules.world.promoteNpc(state,{personId:current.personId},`${sourceId}:party-mechanics`).state;
  }
  const joined=personCommitments(state,current.personId).find((r:any)=>r.id===current.id)!;
  event(state,joined,'completed',sourceId,{membership:joined.membership,reason:response.reason});
 }
 rules.expedition.loot.priorityDecision(state,current,sourceId);
 const final=personCommitments(state,current.personId).find((r:any)=>r.id===current.id)!;
 const result=!deferred&&state.扩展.story.active.results.find((r:any)=>r.receipt?.commitment?.id===record.id);
 if(result){result.receipt.response={...response,...(record.kind==='hire'&&response.accept?{quoteId:sourceId}:{}),status:final.status};if(lootDelivery)result.receipt.lootDelivery=lootDelivery;result.receipt.commitment=structuredClone(final);result.status=response.accept?'succeeded':'failed';if(!response.accept)result.reason='对方拒绝了这项提议';}
 const summary=response.accept?(record.kind==='loot-resolution'?(lootDelivery?.status==='completed'?`各方确认后已将${lootDelivery.quantity}件${lootDelivery.name}交给约定领取人，使用原实物或材料账；未支付额外钱币。`:lootDelivery?.status==='agreed'?lootDelivery.reason:'本人已确认此方案；仍需其他原参与者确认，尚未交付。'):record.kind==='loot'?'本人已确认这版分配条款；仍需其他受影响成员分别确认，没有转移或生成收获。':record.kind==='contact'?'双方已交换魂导通讯联络方式，离开后可以尝试联系；不保证随时接通，没有移动人物或转移物品。':record.kind==='party'?`对方已自愿加入${record.membership==='long-term'?'长期队伍，返程后仍保留成员身份':'本次临时队伍，约定远征结束即离队'}；没有收取雇佣费或自动约定收获分配。`:record.kind==='relationship'?'双方已确认关系；没有转移财产、改变能力或约定其他行为。':record.kind==='meeting'?'对方接受邀约；尚未赴约，双方需要实际到场。':record.kind==='give-item'?'对方接受了赠物承诺；尚未交付物品。':'对方接受了赠款承诺；尚未付款或完成。'):'这项约定未被接受；没有转移财产或位置。';
 const finalSummary=record.kind==='hire'?(response.accept?`${state.人物.列表[record.personId].name}愿意按${response.fee}金魂币提供本次同行，报价限本日原地点；尚待玩家接受、付款和入队。`:'对方没有提供本次同行报价；未付款或入队。'):summary;
 if(result&&['party','contact','hire','loot','loot-resolution'].includes(record.kind))result.receipt.summary=finalSummary;
 return {state,receipt:{type:'commitment-responded',commitment:structuredClone(final),summary:finalSummary}};
}

export function proposeParty(state:any,input:Record<string,any>,sourceId:string){
 if(!['temporary','long-term'].includes(input.membership))throw Error('请明确本次临时同行或长期入队');
 const dungeonId=input.membership==='temporary'?input.dungeonId:null;
 if(input.membership==='temporary'&&!rules.expedition.DUNGEON_PROFILES[dungeonId]||input.membership==='long-term'&&input.dungeonId)throw Error('临时同行须约定真实远征目的地；长期成员不绑定单次远征');
 if(all(state).some(r=>r.id===sourceId))throw Error('这项同行提议编号已经使用');
 const met=contactStoryPerson(state,input.characterId);state=met.state;
 const room=rules.interiorSpaces.membership(state,met.receipt.personId)?.space;
 const guestRealmId=room?.ownerId===state.角色.主控单位ID&&rules.residentRealms.guestRecord(state,room.id,met.receipt.personId)?room.id:null;
 const returning=!!guestRealmId&&rules.world.partyMembers(state).some((m:any)=>m.personId===met.receipt.personId);
 const availability=returning?{available:true}:rules.world.partyJoinAvailability(state,met.receipt.personId,input.membership,!!guestRealmId||!!soulContact(state,met.receipt.personId));if(!availability.available)throw Error(availability.reason);
 if(all(state).filter(r=>r.status==='pending').length>=3)throw Error('请先完成已有约定的回应');
 const person=state.人物.列表[met.receipt.personId],record={id:sourceId,kind:returning?'realm-return':'party',...(guestRealmId?{guestRealmId}:{}),membership:input.membership,dungeonId,playerId:state.角色.主控单位ID,personId:person.id,locationId:state.地图.当前地点ID,status:'pending',events:[]};
 event(state,record,'pending',sourceId,{reason:'玩家提出自愿同行，等待人物独立回应；尚未入队'});
 (person.扩展.社交约定??=[]).push(record);
 return {state,receipt:{type:'commitment-proposed',commitment:structuredClone(record),summary:`邀请${person.name}${input.membership==='long-term'?'长期入队':`一同前往${rules.expedition.DUNGEON_PROFILES[dungeonId].name}`}，尚待本人回应。`}};
}
export function endStoryParty(state:any,input:Record<string,any>,sourceId:string){
 const block=rules.world.worldActionBlockReason(state);if(block)throw Error(block);
 const id=rules.arena.CHARACTER_CATALOG[input.characterId]?rules.arena.persistentCharacterId(input.characterId):input.characterId;
 const ended=rules.world.endPartyMembership(state,id,input.membershipId,sourceId,state.角色.主控单位ID,'玩家结束同行约定；身份、财物、关系和经历保留');
 return {state,receipt:{type:'party-ended',personId:id,ended,summary:'已结束同行约定并释放名额；原人物、伤势、财物、关系和共同经历保留，没有自动退款或扣关系。'}};
}
export function proposeItemPromise(state:any,input:Record<string,any>,sourceId:string){
 if(all(state).some(r=>r.id===sourceId))throw Error('这项承诺编号已经使用');
 if(!Number.isSafeInteger(input.dueDay)||input.dueDay<state.世界.时间.day)throw Error('赠物承诺须指定未过期的世界日编号');
 const met=contactStoryPerson(state,input.characterId);state=met.state;
 if(all(state).filter(r=>r.status==='pending').length>=3)throw Error('请先完成已有约定的回应');
 const gift=rules.world.previewGift(state,{personId:met.receipt.personId,itemId:input.itemId,quantity:input.quantity,promise:true});
 const person=state.人物.列表[gift.personId];person.扩展.社交约定??=[];
 const record={id:sourceId,kind:'give-item',playerId:state.角色.主控单位ID,personId:person.id,itemId:gift.itemId,itemName:gift.itemName,templateId:gift.templateId,quantity:gift.quantity,dueDay:input.dueDay,status:'pending',locationId:state.地图.当前地点ID,events:[]};
 event(state,record,'pending',sourceId,{reason:'玩家提出无附加条件的赠物承诺，等待对方回应'});person.扩展.社交约定.push(record);
 return {state,receipt:{type:'commitment-proposed',commitment:structuredClone(record),summary:`承诺在第${record.dueDay}日结束前赠予${person.name}${record.quantity}件${record.itemName}；尚待回应，未交付或预留物品。`}};
}
export function settleStoryPromise(state:any,input:Record<string,any>,sourceId:string,cancel=false){
 const met=cancel?contactStoryPerson(state,input.characterId):meetStoryPerson(state,input.characterId);state=met.state;
 const record=personCommitments(state,met.receipt.personId).find((r:any)=>r.id===input.commitmentId);
 if(!record||terminal.includes(record.status)||commitmentExpired(state,record))throw Error('这项约定已结束或不属于当前双方');
 if(record.origin?.control)throw Error('受控赠物须经新的原来源控制命令履约，不能使用普通承诺入口');
 if(cancel){event(state,record,'cancelled',sourceId);return {state,receipt:{type:'commitment-cancelled',commitment:structuredClone(record),summary:'已告知对方撤回约定；没有转移财产。'}};}
 if(record.status!=='accepted'||!['give-gold','give-item'].includes(record.kind))throw Error('对方尚未接受这项赠款或赠物承诺');
 if(record.kind==='give-item'){
  const gift=rules.world.previewGift(state,{personId:record.personId,itemId:record.itemId,quantity:record.quantity});
  if(gift.templateId!==record.templateId)throw Error('原承诺物品已经变化');
  const delivered=rules.world.transferItem(state,gift.itemId,gift.destinationId,gift.quantity);
  if(!delivered.legalOwnerEntityId||delivered.legalOwnerEntityId===record.playerId)delivered.legalOwnerEntityId=record.personId;
  delivered.stolen=!!delivered.legalOwnerEntityId&&delivered.legalOwnerEntityId!==record.personId;
  event(state,record,'completed',sourceId,{quantity:gift.quantity,deliveredItemId:delivered.id});
  const goodwill=recordGoodwill(state,record.personId,sourceId,'promise');
  return {state,receipt:{type:'commitment-completed',commitment:structuredClone(record),quantity:gift.quantity,deliveredItemId:delivered.id,summary:`已向${state.人物.列表[record.personId].name}交付${gift.quantity}件${record.itemName}，兑现了赠物承诺。${goodwill>0?`对方的好感提高了${goodwill}点。`:''}`}};
 }
 const player=state.人物.列表[record.playerId],person=state.人物.列表[record.personId];
 const from=state.钱包.列表[player.walletId],to=state.钱包.列表[person.walletId];
 if(!from||!to||from===to||!Number.isSafeInteger(record.amount)||record.amount<1||from.gold<record.amount||!Number.isSafeInteger(to.gold+record.amount))throw Error('余额不足或收款钱包无法完成这次转账');
 from.gold-=record.amount;to.gold+=record.amount;
 event(state,record,'completed',sourceId,{paid:record.amount});
 const goodwill=recordGoodwill(state,record.personId,sourceId,'promise');
 return {state,receipt:{type:'commitment-completed',commitment:structuredClone(record),paid:record.amount,summary:`已向${person.name}交付${record.amount}金魂币，兑现了赠款承诺。${goodwill>0?`对方的好感提高了${goodwill}点。`:''}`}};
}

export function attendInvitation(state:any,input:Record<string,any>,sourceId:string){
 const met=meetStoryPerson(state,input.characterId);state=met.state;
 const record=personCommitments(state,met.receipt.personId).find((r:any)=>r.id===input.commitmentId);
 if(!record||record.kind!=='meeting'||record.status!=='accepted'||commitmentExpired(state,record))throw Error('没有尚可赴约的已接受邀约');
 if(worldMinute(state.世界.时间)<worldMinute(record.startsAt))throw Error('还没有到约见时间');
 if(state.地图.当前地点ID!==record.locationId)throw Error('双方尚未到达约定地点');
 event(state,record,'completed',sourceId,{locationId:record.locationId,participants:[record.playerId,record.personId]});
 return {state,receipt:{type:'commitment-completed',commitment:structuredClone(record),summary:'双方已按约定的时间和地点见面。'}};
}

export function proposeSoulContact(state:any,input:Record<string,any>,sourceId:string){
 const met=meetStoryPerson(state,input.characterId);state=met.state;
 if(soulContact(state,met.receipt.personId))throw Error('双方已经交换过魂导通讯联络方式');
 if(all(state).some(r=>r.id===sourceId))throw Error('联络提议来源已经使用');
 if(all(state).filter(r=>r.status==='pending').length>=3)throw Error('请先完成已有约定的回应');
 const person=state.人物.列表[met.receipt.personId],record={id:sourceId,kind:'contact',channel:'soul-device',playerId:state.角色.主控单位ID,personId:person.id,locationId:state.地图.当前地点ID,status:'pending',events:[]};
 event(state,record,'pending',sourceId,{reason:'玩家提出互留魂导通讯联络方式，等待本人独立回应'});(person.扩展.社交约定??=[]).push(record);
 return {state,receipt:{type:'commitment-proposed',commitment:structuredClone(record),summary:`向${person.name}提议交换魂导通讯联络方式；尚待回应，未建立远程联系。`}};
}

export function proposeLoot(state:any,input:Record<string,any>,sourceId:string){
 if(!rules.expedition.DUNGEON_PROFILES[input.dungeonId])throw Error('请选择实际远征目的地');
 const met=contactStoryPerson(state,input.characterId,state.扩展?.story?.active?.partyChat?{party:true}:undefined);state=rules.expedition.normalizeState(met.state);
 return {state,receipt:rules.expedition.loot.recordProposal(state,{...input,characterId:met.receipt.personId},sourceId)};
}
export function proposeLootResolution(state:any,input:Record<string,any>,sourceId:string){
 const met=contactStoryPerson(state,input.characterId,state.扩展?.story?.active?.partyChat?{party:true}:undefined);state=met.state;
 return {state,receipt:rules.expedition.loot.recordProposal(state,{...input,characterId:met.receipt.personId},sourceId,'loot-resolution')};
}
export function collectLoot(state:any,input:Record<string,any>,sourceId:string){
 const delivery=rules.expedition.loot.completeResolution(state,input.resolutionId,sourceId,false,state.角色.主控单位ID);
 return {state,receipt:{type:'loot-collected',actorId:state.角色.主控单位ID,lootDelivery:delivery,summary:delivery.status==='already-completed'?'这项分配已经履行，原交付记录保留，没有再次领取或生成收获。':`已按全部原参与者确认的方案交付${delivery.quantity}件${delivery.name}；记录实际归属与容器，没有复制物品或额外付钱。`}};
}
