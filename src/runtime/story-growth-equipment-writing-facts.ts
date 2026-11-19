import type {StoryTurn,StoryStepResult} from './story-turns';

const select=(v:any,keys:string[])=>Object.fromEntries(keys.filter(key=>Object.hasOwn(v,key)).map(key=>[key,structuredClone(v[key])]));
export const GROWTH_EQUIPMENT_RECEIPT_FIELDS:Record<string,readonly string[]>={
 'inventory-inspected':['entityId','inventory','details','comparison'],
 'growth-inspected':['growth'],
 'growth-attribute-allocated':['unitId','attribute','raised','spent','score','availableAttributePoints','nextCost','derivedAfter'],
 'intimate-craft':['actorId','itemId','name','gold','before','after','minutes','interruption','craftSource'],
 'intimate-equip':['actorId','itemId','weapon','slot','level','forced','wearableEventId','before','after','minutes','interruption'],
 'intimate-detach':['actorId','itemId','worn','wearableEventId','before','after','minutes','interruption'],
 'device.lock':['actorId','itemId','lockId','success','consequence','eventId','eventHash','minutes','before','after','interruption','requestHash'],
 'device.unlock':['actorId','itemId','lockId','success','consequence','eventId','eventHash','minutes','before','after','interruption','requestHash'],
 'host.set-suppression':['actorId','itemId','completed','detail','before','after','minutes','interruption','reason'],
 'host.set-form':['actorId','itemId','completed','detail','before','after','minutes','interruption','reason'],
 'host.set-appearance':['actorId','itemId','completed','detail','before','after','minutes','interruption','reason'],
 'item-equipped':['entityId','itemId','slot','modifiers','replacingItemId'],
 'item-unequipped':['entityId','itemId','slot','modifiers','releaseProof'],
 'party-recovered':['actorId','recoveries','skipped'],
 'safe-point-recovered':['entityId','locationId','before','after','clearedStatuses'],
 'retract-martial-soul':['actorId','minutes','before','after','interruption','check'],
 'restrain-desire':['actorId','minutes','before','after','interruption','check'],
 'break-restraint':['actorId','before','after','statusId','startedAt','endedAt','profile','actorProof','attributeStatuses','statusProof','die','passed','minutes','interruption','statusEvents','remainingLayers','hash'],
};

/** Actual per-operation values. Final turn resources are compiled separately, not backdated here. */
export function compileGrowthEquipmentReceipt(turn:StoryTurn,result:StoryStepResult){
 const receipt=result.receipt!,context=result.context;
 const fields=GROWTH_EQUIPMENT_RECEIPT_FIELDS[receipt.type];if(!fields)throw Error(`成长装备结果缺少编译：${receipt.type}`);
 const unknown=Object.keys(receipt).filter(key=>!['type','summary','id','transactionType',...fields].includes(key));
 if(unknown.length)throw Error(`成长装备结果缺少字段编译：${receipt.type}/${unknown.join(',')}`);
 const actorId=receipt.actorId??receipt.unitId??receipt.entityId??turn.after?.player?.id;
 if(['intimate-craft','intimate-equip','intimate-detach'].includes(receipt.type))return {stage:receipt.type==='intimate-craft'?'器具制作已交付':receipt.type==='intimate-equip'?'器具已装配':'器具已拆下',actorId,...select(receipt,fields.filter(key=>key!=='actorId'))};
 if(['device.lock','device.unlock'].includes(receipt.type))return {stage:receipt.type==='device.lock'?'实体锁已闭合':'实体锁已打开',actorId,...select(receipt,fields.filter(key=>key!=='actorId'))};
 if(['host.set-suppression','host.set-form','host.set-appearance'].includes(receipt.type))return {stage:receipt.completed?'宿主调节已完成':'宿主调节未完成',actorId,...select(receipt,['itemId','completed','detail','before','after','minutes','interruption','reason'])};
 if(['retract-martial-soul','restrain-desire','break-restraint'].includes(receipt.type))return {stage:receipt.type==='retract-martial-soul'?'武魂已收回':receipt.type==='restrain-desire'?'主动克制已结算':'日常挣脱已结算',actorId,minutes:receipt.minutes,...select(receipt,['before','after']),interruption:structuredClone(receipt.interruption??null),check:structuredClone(receipt.check??null),...(receipt.type==='break-restraint'?{statusId:receipt.statusId,die:receipt.die,total:receipt.die+receipt.profile.modifier,dc:receipt.profile.dc,passed:receipt.passed,remainingLayers:receipt.remainingLayers}:{})};
 if(receipt.type==='inventory-inspected')return {stage:'查询已完成',actorId,query:'本人现有物品、数量与携带或寄存位置',answer:structuredClone(receipt.inventory),...select(receipt,['details','comparison'])};
 if(receipt.type==='growth-inspected')return {stage:'查询已完成',actorId,query:'等级经验、成长瓶颈、修炼与魂环资格及属性提升条件',answer:structuredClone(receipt.growth)};
 if(receipt.type==='growth-attribute-allocated')return {stage:'属性分配已执行',actorId,attribute:receipt.attribute,
  pointsSpent:receipt.spent,attributeIncrease:receipt.raised,attributeAfter:receipt.score,pointsRemaining:receipt.availableAttributePoints,
  nextIncreaseCost:receipt.nextCost,derivedAfter:structuredClone(receipt.derivedAfter)};
 if(receipt.type==='party-recovered')return {stage:'队伍休整已完成',actorId,recoveries:receipt.recoveries.map((r:any)=>compileGrowthEquipmentReceipt(turn,{...result,receipt:r})),skipped:structuredClone(receipt.skipped)};
 if(receipt.type==='safe-point-recovered')return {stage:'安全点休整已完成',actorId,locationId:receipt.locationId,
  resources:Object.keys(receipt.after).map(resource=>({resource,before:receipt.before[resource]??null,after:receipt.after[resource]})),
  clearedStatusCount:receipt.clearedStatuses};
 const candidates=[...(context?.after.objects??[]),...(context?.before.objects??[]),...(turn.after?.inventory??[]),...(turn.before?.inventory??[])];
 const item=candidates.find((item:any)=>item.id===receipt.itemId);
 return {stage:receipt.type==='item-equipped'?'装备已装入槽位':'装备已从槽位卸下',actorId,itemId:receipt.itemId,...(receipt.replacingItemId?{replacingItemId:receipt.replacingItemId}:{}),
  itemIdentity:item?select(item,['id','name','type','templateId']):null,slot:receipt.slot,
  equipmentBonusesAfter:structuredClone(receipt.modifiers),
  equipmentAttributeChanges:equipmentAttributeChanges(turn,result,actorId),
  resourceChanges:equipmentResourceChanges(result,actorId)};
}

/** Equipment can change resource limits without any six-dimensional bonus.
 * Use this operation's actual observations, including unchanged current values
 * alongside a changed limit, rather than attributing the end-of-turn change. */
function equipmentResourceChanges(result:StoryStepResult,actorId:string){
 const before=result.context?.before.people.find(p=>p.id===actorId)?.resources;
 const after=result.context?.after.people.find(p=>p.id===actorId)?.resources;
 if(!before||!after)return null;
 return Object.entries(after).flatMap(([resource,values]:[string,any])=>{
  if(!values||typeof values!=='object')return [];
  const rows=Object.keys(values).filter(field=>Number.isFinite(values[field])&&Number.isFinite(before[resource]?.[field]))
   .map(field=>({resource,field,before:before[resource][field],after:values[field],delta:values[field]-before[resource][field]}));
  return rows.some(row=>row.delta!==0)?rows.filter(row=>row.delta!==0||['当前','最大'].includes(row.field)):[];
 });
}

/** An immediately preceding equipment operation supplies a baseline only when
 * its frozen observation is also this operation's starting observation. Never
 * infer across another action, actor, battle, missing observation or turn. */
function equipmentAttributeChanges(turn:StoryTurn,result:StoryStepResult,actorId:string){
 const index=turn.results.findIndex(row=>row.step===result.step),previous=turn.results[index-1];
 const equipment=(row:StoryStepResult|undefined)=>row?.status==='succeeded'&&['item-equipped','item-unequipped'].includes(row.receipt?.type);
 if(!equipment(result)||!equipment(previous)||previous.step+1!==result.step||previous.receipt!.entityId!==actorId
  ||previous.receipt!.report||turn.results[index].receipt?.report)return null;
 const left=previous.context?.after,right=result.context?.before;
 const leftPerson=left?.people.find(p=>p.id===actorId),rightPerson=right?.people.find(p=>p.id===actorId);
 if(!leftPerson||!rightPerson||JSON.stringify([left!.time,left!.location,leftPerson])!==JSON.stringify([right!.time,right!.location,rightPerson]))return null;
 const before=previous.receipt!.modifiers?.attributes,after=result.receipt!.modifiers?.attributes;
 if(!before||!after)return null;
 const attributes=Object.keys(after).filter(key=>Number.isFinite(before[key])&&Number.isFinite(after[key]))
  .map(attribute=>({attribute,before:before[attribute],after:after[attribute],delta:after[attribute]-before[attribute]}));
 return attributes.length?{previousStep:previous.step,attributes}:null;
}

export function equipmentEventAccount(type:string,f:any,actor:string,item:string){
  const knownTotals=Object.entries(f.equipmentBonusesAfter.attributes??{}).filter(([,value])=>Number.isFinite(value)),totals=knownTotals.filter(([,value])=>value!==0);
 const changes=f.equipmentAttributeChanges?.attributes.filter((row:any)=>row.before!==0||row.after!==0);
 return [
  `${actor}已${type==='item-equipped'?'在':'从'}${f.slot}槽位${type==='item-equipped'?'装上':'卸下'}${item}。`,
   ...(knownTotals.length?[totals.length?`当前装备的六维加成：${totals.map(([attribute,value])=>`${attribute}${Number(value)>0?'+':''}${value}`).join('、')}。`:'当前装备没有六维加成。']:[]),
   ...(changes?.length?[`六维装备加成变化：${changes.map((row:any)=>`${row.attribute}${row.before}→${row.after}（变化${row.delta>0?'+':''}${row.delta}）`).join('；')}。`]:[]),
   ...(f.resourceChanges?.length?[`资源变化：${f.resourceChanges.map((row:any)=>`${row.resource}${row.field}${row.before}→${row.after}（变化${row.delta>0?'+':''}${row.delta}）`).join('；')}。`]:[])
 ].join('');
}
