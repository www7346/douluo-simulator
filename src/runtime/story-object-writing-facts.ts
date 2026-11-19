import {compileStoryCheckReceipt} from './story-check-writing-facts';
import type {StoryEventNames} from './story-event-names';
const copy=<T>(v:T):T=>structuredClone(v);
const pick=(v:any,keys:string[])=>Object.fromEntries(keys.filter(k=>v&&Object.hasOwn(v,k)).map(k=>[k,copy(v[k])]));
function known(v:any,fields:string[],label:string){const unknown=Object.keys(v).filter(k=>!['type','id','transactionType','summary','meaning',...fields].includes(k));if(unknown.length)throw Error(`对象结果缺少字段编译：${label}/${unknown.join(',')}`);}
const objectKind=(kind:string)=>{if(!['person','item'].includes(kind))throw Error(`对象类型缺少编译：${kind}`);return kind==='person'?'人物':'物品';};
function mention(m:any){
 known(m,['name','aliases','quote','reason','source','evidence','details','recordedAt','locationId'],'对象原话来源');
 const details=(m.details??[]).map((d:any)=>{known(d,['field','value','quote','basis'],'对象资料');if(!['observed','reported'].includes(d.basis))throw Error('对象资料缺少认知分类');return {field:d.field,value:copy(d.value),quote:d.quote,basis:d.basis==='observed'?'来源中已确定的资料':'来源中的自述或传闻'};});
 return {...pick(m,['name','aliases','quote','reason','source','evidence','recordedAt','locationId']),details};
}
export function compileObjectContext(rows:any[]){return rows.map(r=>{
 known(r,['level','entityId','knownDetails','mentions','currentItem','omittedMentions'],'叙事对象当前资料');
 return {objectId:r.id,kind:objectKind(r.type),stage:r.level==='instantiated'?'已关联正式实例':'仅有叙事记录',entityId:r.entityId??null,
  detailsAtOriginalSource:copy(r.knownDetails),mentions:r.mentions.map(mention),currentItem:copy(r.currentItem??null),omittedMentions:r.omittedMentions??0};
});}
export const OBJECT_RECEIPT_FIELDS:Record<string,string[]>={
 'story-object-resolved':['query','status','matches','objectId'],'person-name-resolved':['query','status','matches','personId'],
 'story-object-remembered':['objectId','objectType','level','mention'],
 'story-item-instantiated':['objectId','itemId','ownerEntityId','legalOwnerEntityId','reused','itemIdentity'],
 'story-person-created':['sourceId','personId','objectId','reused','characterId','name','metBefore','inheritedDetails','archetypeId','level','martialSoulIds','tier','identity','locationId'],
 'character-met':['characterId','personId','name','metBefore'],'person-label-recorded':['personId','name','label','scope'],
 'story-check-history':['records','total','nextBefore'],
};
export function compileObjectReceipt(c:any){
 const fields=OBJECT_RECEIPT_FIELDS[c.type];if(!fields)throw Error(`对象回执缺少编译：${c.type}`);known(c,fields,c.type);
 if(c.type==='story-object-resolved'||c.type==='person-name-resolved'){
  const stages:Record<string,string>={unique:'已唯一确定所指对象',ambiguous:'有多个匹配对象，尚未确定所指',missing:'本次查询未找到匹配对象'};
  if(!stages[c.status])throw Error('对象解析状态缺少编译');return {stage:stages[c.status],query:c.query,matches:copy(c.matches),selectedId:c.status==='unique'?(c.personId??c.objectId):null};
 }
 if(c.type==='story-object-remembered')return {stage:'对象原话与来源已记录',objectId:c.objectId,kind:objectKind(c.objectType),record:mention(c.mention)};
 if(c.type==='story-item-instantiated')return {stage:c.reused?'沿用既有物品实例':'叙事物品已登记为实物',objectId:c.objectId,itemId:c.itemId,holderId:c.ownerEntityId,
  item:copy(c.itemIdentity??null),legalOwnerId:(c.itemIdentity?.legalOwnerEntityId??c.legalOwnerEntityId)||null,reused:c.reused};
 if(c.type==='story-person-created')return {stage:c.reused?'沿用原人物身份与实例':'人物身份已登记并相遇',personId:c.personId,objectId:c.objectId??null,
  ...pick(c,['sourceId','characterId','name','identity','tier','locationId','archetypeId','inheritedDetails']),registeredLevel:c.level??null,registeredSoulIds:copy(c.martialSoulIds??null),reused:c.reused??false};
 if(c.type==='character-met')return {stage:c.metBefore?'与已认识的人物再次相遇':'首次与此人物相遇',personId:c.personId,characterId:c.characterId,name:c.name};
 if(c.type==='person-label-recorded')return {stage:'玩家使用的称呼已记录',personId:c.personId,registeredName:c.name,usedByPlayerId:c.label.playerId,label:c.label.name,source:copy(c.label.source)};
 return {stage:'已查询存档中的检定历史',totalRetained:c.total,nextBefore:c.nextBefore,
  records:c.records.map((r:any)=>({source:pick(r,['branchId','turn','step']),result:compileStoryCheckReceipt(r.receipt)}))};
}

export function objectEventAccount(type:string,f:any,n:StoryEventNames):string{
 if(['story-object-resolved','person-name-resolved'].includes(type))return `查找“${f.query}”：${f.stage}。${f.matches.length?`匹配到${f.matches.map((m:any)=>m.name??m.id??m.objectId).join('、')}。`:'没有匹配记录。'}`;
 if(type==='story-object-remembered')return `已记录${f.kind}“${f.record.name}”的原话来源：${f.record.quote}。当前只是叙事记录。`;
 if(type==='story-item-instantiated')return `${f.stage}：${f.item?.name??n.item(f.itemId)}，实际持有人${n.person(f.holderId)}${f.legalOwnerId?`，登记所有者${n.person(f.legalOwnerId)}`:''}。`;
 if(type==='story-person-created')return `${f.stage}：${f.name??n.person(f.personId)}${f.registeredLevel===null?'':`，登记等级${f.registeredLevel}`}。`;
 if(type==='character-met')return `${f.stage}：${f.name??n.person(f.personId)}。`;
 if(type==='person-label-recorded')return `${n.person(f.usedByPlayerId)}将“${f.label}”作为对${f.registeredName}的称呼，仍关联原人物身份。`;
 return `已查看检定历史，本次返回${f.records.length}条、总共保留${f.totalRetained}条。`+f.records.map((r:any)=>`此前第${r.source.turn}轮的${r.result.attribute}检定：${r.result.outcome}。`).join('');
}
