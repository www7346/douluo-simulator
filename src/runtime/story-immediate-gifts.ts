import {recordGoodwill} from './social-goodwill';
import {storyItemResult} from '../shared/story-item-result';
import {rules} from '../rules';
import {meetStoryPerson} from './story-people';
import {validateCommitmentResponse} from './story-commitments';
import {pendingImmediateGifts,deferredImmediateGifts} from '../shared/story-immediate-gifts';
import {soulContact} from '../shared/story-communication';

const deferredRows=(state:any):any[]=>state.扩展?.deferredImmediateGifts?.records??[];
const stampDeferred=(record:any)=>{const {hash:_,...body}=record;record.hash=rules.abilities.hash(body);};
/** Freeze only offers which could not receive the person's own response. */
export function deferImmediateGifts(state:any,turn:any,branchId:string){
 for(const result of turn.results){
  const offer=result.receipt;if(offer?.type!=='person-gift-offered'||offer.response||!rules.influence.voluntaryReason(state,offer.personId))continue;
  state.扩展.deferredImmediateGifts??={version:1,records:[]};
  if(deferredRows(state).some(row=>row.id===offer.id))continue;
  const action={...structuredClone(result.action),characterId:offer.personId,...(offer.kind==='give-item'?{itemId:offer.itemId}:{})};delete action.characterStep;delete action.itemStep;
  const controlEpisodeId=rules.influence.autonomy(state,offer.personId).sources.find((s:any)=>s.kind==='status.mind_control')?.sourceStatusId;
  const record={id:offer.id,controlEpisodeId,deferredAt:rules.people.now(state),deferredOrder:rules.people.nextEventOrder(state),origin:{branchId,turn:turn.number,result:{step:result.step,source:result.source,action,status:'succeeded',executionSourceId:result.executionSourceId}},offer:structuredClone(offer)};
  stampDeferred(record);deferredRows(state).push(record);
 }
}
export function validateDeferredImmediateGifts(state:any){
 const db=state.扩展?.deferredImmediateGifts;if(db===undefined)return;
 if(db.version!==1||!Array.isArray(db.records))throw Error('暂待回应的赠送记录无效');
 const seen=new Set();
 for(const row of db.records){
  const {hash,...body}=row;if(hash!==rules.abilities.hash(body)||seen.has(row.id)||row.id!==row.offer?.id||row.offer.response||row.offer.delivery||typeof row.origin?.branchId!=='string'||!Number.isSafeInteger(row.origin?.turn)||row.origin.turn<1)throw Error('暂待回应的赠送缺少原提议来源');seen.add(row.id);
  const episode=state.扩展?.controlEpisodes?.[row.controlEpisodeId];
  if(!episode||episode.kind!=='status.mind_control'||episode.targetId!==row.offer.personId||!Number.isSafeInteger(row.deferredAt)||!Number.isSafeInteger(row.deferredOrder)||row.deferredAt<episode.appliedAt||row.deferredAt>rules.people.now(state)||row.deferredOrder<=episode.appliedOrder||row.deferredOrder>state.扩展.personEventSequence||episode.endedOrder!==undefined&&(episode.endedAt<row.deferredAt||episode.endedOrder<=row.deferredOrder)||!rules.combat.validateControlSourceProof(episode.status,episode.sourceTargetId,rules.sealing.statusTime(state,episode.status,row.deferredAt)))throw Error('延后赠送缺少当时无法自主回应的真实控制来源');
  validateImmediateGiftResult(state,{number:row.origin.turn,status:'resolved',results:[]},{...row.origin.result,receipt:row.offer},row.origin.branchId);
  if(row.response){validateCommitmentResponse(row.response);if(row.response.accept!==!!row.delivery||typeof row.responseSourceId!=='string'||!row.responseSourceId)throw Error('延后赠送答复与交付不一致');}
  else if(row.delivery||row.responseSourceId)throw Error('未回应的赠送不能交付');
  if(row.delivery&&(row.delivery.sourceId!==row.responseSourceId||(row.offer.kind==='give-gold'?row.delivery.paid!==row.offer.amount:row.delivery.quantity!==row.offer.quantity||typeof row.delivery.deliveredItemId!=='string')))throw Error('延后赠送交付数量无效');
 }
}

function available(state:any,offer:any){
 const player=state.人物.列表[offer.playerId],person=state.人物.列表[offer.personId];
 rules.people.assertAlive(state,person.id);
 rules.actions.resolve(state,{actorId:player.id,battleId:null,targetIds:[person.id],requirements:['gesture']});
 if(!(globalThis as any).SoulScenePosition.communicationColocated(state,player.id,person.id))throw Error('赠送双方不在当前地点');
 if(offer.kind==='give-item'){
  const quote=rules.world.previewGift(state,{personId:person.id,itemId:offer.itemId,quantity:offer.quantity});
  if(quote.templateId!==offer.templateId)throw Error('赠送物品已经变化');return quote;
 }
 const from=state.钱包.列表[player.walletId],to=state.钱包.列表[person.walletId];
 if(!from||!to||from===to||!Number.isSafeInteger(offer.amount)||offer.amount<1||from.gold<offer.amount||!Number.isSafeInteger(to.gold+offer.amount))throw Error('余额不足，无法完成这次赠送');
 return {from,to};
}
export function immediateGiftAvailability(state:any,offer:any){try{available(state,offer);return {available:true,reason:''};}catch(error){return {available:false,reason:(error as Error).message};}}
export function offerImmediateGift(state:any,action:any,sourceId:string){
 const met=meetStoryPerson(state,action.characterId);state=met.state;
 const offer:any={type:'person-gift-offered',id:sourceId,kind:action.kind,playerId:state.角色.主控单位ID,personId:met.receipt.personId,locationId:state.地图.当前地点ID};
 if(action.kind==='give-item'){
  const gift=rules.world.previewGift(state,{personId:offer.personId,itemId:action.itemId,quantity:action.quantity});
  Object.assign(offer,{itemId:gift.itemId,itemName:gift.itemName,templateId:gift.templateId,quantity:gift.quantity});
 }else offer.amount=action.amount;
 available(state,offer);offer.summary='向'+state.人物.列表[offer.personId].name+'赠送'+(offer.kind==='give-item'?offer.quantity+'件'+offer.itemName:offer.amount+'金魂币')+'，等待对方答复。';
 return {state,receipt:offer};
}
export function respondImmediateGift(state:any,input:any,sourceId:string){
 const turn=state.扩展?.story?.active;
 const deferred=input.deferred===true?deferredRows(state).find(row=>row.id===input.giftId&&!row.response):null;
 if(input.deferred===true&&!deferred)throw Error('这次赠送已经回应或不存在原提议');
 if(!deferred&&(state.扩展?.story?.branchId!==input.branchId||turn?.number!==input.turn))throw Error('赠送回应的回合已经变化');
 const offer=deferred?deferredImmediateGifts(state).find(o=>o.id===input.giftId):pendingImmediateGifts(state).find(o=>o.id===input.giftId);if(!offer)throw Error('这次赠送已经回应或本人目前无法自主回应');
 rules.influence.assertVoluntary(state,offer.personId);
 if(deferred)available(state,offer);
 if(deferred){const remote=!rules.actions.communicationColocated(state,offer.personId,offer.playerId);if(remote&&!soulContact(state,offer.personId))throw Error('双方当前没有可接通的赠送回应通道');rules.social.communicate(state,offer.personId,offer.playerId,remote);}
 const response=validateCommitmentResponse(input.response),result=deferred?null:turn.results.find((r:any)=>r.receipt===offer);
 let delivery:any;
 if(response.accept){
  const quote:any=available(state,offer);
  if(offer.kind==='give-item'){
   const item=rules.world.transferItem(state,offer.itemId,quote.destinationId,offer.quantity);
   if(!item.legalOwnerEntityId||item.legalOwnerEntityId===offer.playerId)item.legalOwnerEntityId=offer.personId;
   item.stolen=!!item.legalOwnerEntityId&&item.legalOwnerEntityId!==offer.personId;
   delivery={sourceId,deliveredItemId:item.id,quantity:offer.quantity};
  }else{quote.from.gold-=offer.amount;quote.to.gold+=offer.amount;delivery={sourceId,paid:offer.amount};}
 }
 const summary=response.accept?'已向'+state.人物.列表[offer.personId].name+'交付'+(offer.kind==='give-item'?offer.quantity+'件'+offer.itemName:offer.amount+'金魂币')+'。':'对方没有收下赠礼。';
 if(delivery)recordGoodwill(state,offer.personId,sourceId,'gift');
 if(deferred){deferred.response=response;deferred.responseSourceId=sourceId;if(delivery)deferred.delivery=delivery;stampDeferred(deferred);}
 else{offer.response=response;if(delivery)offer.delivery=delivery;result.status=response.accept?'succeeded':'failed';if(!response.accept)result.reason='对方婉拒了这份赠礼';offer.summary=summary;}
 return {state,receipt:{type:'person-gift-responded',giftId:offer.id,response,...(delivery?{delivery}:{}),summary}};
}
export function validateImmediateGiftResult(state:any,turn:any,result:any,branchId:string){
 const o=result.receipt;if(o?.type!=='person-gift-offered')return;
 const a=result.action,ref=a.characterStep===undefined?a.characterId:turn.results[a.characterStep]?.receipt?.personId;
 const personId=rules.arena.worldCharacterRecord(ref,state)?rules.arena.persistentCharacterId(ref):ref;
 const allowed=['type','id','kind','playerId','personId','locationId','summary','response','delivery',...(a.kind==='give-item'?['itemId','itemName','templateId','quantity']:['amount'])];
 if(Object.keys(o).some(k=>!allowed.includes(k))||!['give-item','give-gold'].includes(a.kind)||o.kind!==a.kind||o.id!==result.executionSourceId||typeof o.id!=='string'||!o.id.startsWith('story:')||!o.id.endsWith(`:${turn.number}:${result.step}`)||o.personId!==personId||o.playerId!==state.角色.主控单位ID||!state.地图.地点[o.locationId])throw Error('当场赠送与原行动不一致');
 const itemId=a.itemStep===undefined?a.itemId:storyItemResult(turn.results[a.itemStep]);
 if(o.kind==='give-gold'?o.amount!==a.amount||!Number.isSafeInteger(o.amount)||o.amount<1:o.itemId!==itemId||o.quantity!==a.quantity||!Number.isSafeInteger(o.quantity)||o.quantity<1||!rules.world.ITEM_TEMPLATES[o.templateId]||typeof o.itemName!=='string')throw Error('当场赠送数量与原行动不一致');
 if(o.response){validateCommitmentResponse(o.response);if(result.status!==(o.response.accept?'succeeded':'failed')||o.response.accept!==!!o.delivery)throw Error('赠送答复与实际交付不一致');}
 else if(o.delivery||result.status!=='succeeded'||turn.status==='complete'&&!deferredRows(state).some(row=>row.id===o.id&&row.origin.branchId===branchId&&row.origin.turn===turn.number&&rules.abilities.hash(row.offer)===rules.abilities.hash(o)))throw Error('赠送尚未回应');
 if(o.delivery&&(typeof o.delivery.sourceId!=='string'||(o.kind==='give-gold'?o.delivery.paid!==o.amount:o.delivery.quantity!==o.quantity||typeof o.delivery.deliveredItemId!=='string')))throw Error('赠送交付记录无效');
}
