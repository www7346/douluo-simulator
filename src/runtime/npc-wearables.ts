import {rules} from '../rules';
import {npcWorldMinute} from '../shared/npc-autonomy';

const clone=structuredClone,hash=(v:any)=>rules.abilities.hash(v);
function expectedIntent(actorId:string,choice:any){
 if(choice.action==='craft')return {type:'intimate-craft',actorId,templateId:choice.templateId};
 if(choice.action==='equip')return {type:'intimate-equip',actorId,itemId:choice.itemId,targetId:choice.targetId??actorId,forced:(choice.targetId??actorId)!==actorId,level:choice.level??0};
 if(choice.action==='detach')return {type:'intimate-detach',actorId,itemId:choice.itemId};
 throw Error('人物中性器具记录只接受制作、装配与拆卸');
}
function sourceFor(state:any,receipt:any){
 const db=state.扩展?.wearables;
 return receipt?.type==='intimate-craft'?db?.crafts?.find((v:any)=>v.source.sourceId===receipt.id):db?.events?.find((v:any)=>v.id===receipt?.wearableEventId);
}
/** Permanent neutral ledgers supply the evidence after the recent world cache expires. */
export function settleNpcWearable(state:any,job:any,choice:any,sourceId:string){
 const intent=expectedIntent(job.ownerId,choice),item=state.物品.实例[choice.itemId];
 if(!rules.wearables.registered(choice.action==='craft'?choice.templateId:item))throw Error('未登记公共中性器具');
 const result=rules.world.settleIntent(state,{id:'npc-intimate:'+sourceId,...intent}),source=sourceFor(result.state,result.receipt);
 if(!source)throw Error('人物中性器具操作缺少永久交付或装卸记录');
 const record={version:1,requestId:job.id,decisionSourceId:sourceId,decision:clone(choice),intent,receipt:clone(result.receipt),sourceRef:{id:source.id,hash:source.hash}};
 return {state:result.state,wearableUse:{...record,hash:hash(record)}};
}
export function validateNpcWearableUse(state:any,job:any,goal:any,choice:any){
 const record=goal.wearableUse;if(!record||record.version!==1||goal.hostUse!==undefined)throw Error('人物中性器具决定缺少实际操作来源');
 const {hash:digest,...body}=record,receipt=record.receipt,intent=expectedIntent(goal.ownerId,choice),source=sourceFor(state,receipt);
 if(digest!==hash(body)||hash(record.decision)!==hash(choice)||hash(record.intent)!==hash(intent)||record.requestId!==job.id||record.decisionSourceId!==goal.decisionSourceId||job.status!=='decided'||job.decisionSourceId!==goal.decisionSourceId||goal.status!=='completed'||receipt?.id!=='npc-intimate:'+goal.decisionSourceId||receipt.type!==intent.type||receipt.actorId!==goal.ownerId||!source||hash(record.sourceRef)!==hash({id:source.id,hash:source.hash}))throw Error('人物中性器具原决定、来源或实际回执不一致');
 const itemId=choice.action==='craft'?source.itemProof.id:choice.itemId,templateId=choice.action==='craft'?choice.templateId:source.templateId;
 if(!rules.wearables.registered(templateId)||receipt.itemId!==itemId||npcWorldMinute(receipt.before)!==npcWorldMinute(goal.createdAt)||npcWorldMinute(receipt.after)!==npcWorldMinute(receipt.before)+receipt.minutes||!Number.isSafeInteger(receipt.minutes)||receipt.minutes<0||receipt.minutes>(choice.action==='craft'?5:2))throw Error('人物中性器具实际对象或耗时无效');
 if(choice.action==='craft'){
  if(source.source.actorId!==goal.ownerId||source.source.sourceId!==receipt.id||source.source.templateId!==choice.templateId||source.source.startedAt!==npcWorldMinute(goal.createdAt)||source.source.completedAt!==npcWorldMinute(receipt.after)||hash(receipt.craftSource)!==hash(source.source)||receipt.gold!==source.source.price)throw Error('人物中性制作缺少真实原价交付');
 }else{
  const attachment=source.attachment;
  if(source.kind!==(choice.action==='equip'?'attached':'detached')||source.actorId!==goal.ownerId||source.itemId!==itemId||source.sourceId!==receipt.id||source.at!==npcWorldMinute(goal.createdAt)||receipt.wearableEventId!==source.id||choice.action==='equip'&&(attachment.wearerId!==intent.targetId||attachment.level!==intent.level||receipt.slot!==attachment.slot||receipt.level!==attachment.level||receipt.forced!==attachment.forced)||choice.action==='detach'&&receipt.worn!==false)throw Error('人物中性装卸缺少真实生命周期来源');
 }
 const original=state.世界.processedTransactions?.[receipt.id];if(original&&hash(original)!==hash(receipt))throw Error('人物中性器具回执与原始世界记录不一致');
}
