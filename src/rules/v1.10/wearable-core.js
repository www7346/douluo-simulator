(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulWearableCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // One current protocol for the explicitly registered neutral equipment only.
  const ADAPTER='wearable-v1';
  const REGISTRY=Object.freeze({
    'intimate-blindfold':Object.freeze({name:'眼罩',icon:'🕶️',slots:['眼部'],restrictions:{vision:'眼罩遮蔽'}}),
    'intimate-ball-gag':Object.freeze({name:'口球',icon:'🟡',slots:['口腔'],restrictions:{voice:'口球封声',ingest:'口球封口'}}),
    'intimate-collar':Object.freeze({name:'铃铛项圈',icon:'📿',slots:['颈部'],restrictions:{}})
  });
  const AUTH_STATUS_IDS=Object.freeze(['status.paralysis','status.bind','status.limb_bind','status.sleep','status.stun','status.mind_control','status.soul_control','status.cognition_shift']);
  const clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v)),hash=v=>globalThis.SoulAbilityContract.hash(v),same=(a,b)=>hash(a)===hash(b);
  const stamp=v=>({...v,hash:hash(v)}),valid=v=>{if(!v||typeof v!=='object'||Array.isArray(v))return false;const {hash:h,...body}=v;return h===hash(body);};
  const now=s=>globalThis.SoulPersonCore.now(s),registered=item=>!!REGISTRY[typeof item==='string'?item:item?.templateId],definition=item=>REGISTRY[item?.templateId]??null;
  const managed=item=>registered(item)&&item?.attachment?.adapter===ADAPTER;
  const table=s=>s.扩展?.wearables??null,latest=(s,id)=>table(s)?.events?.filter(e=>e.itemId===id).at(-1)??null;
  function initialAuthority(s,item){
    const r=s.扩展?.openingWorkshop,p=item?.provenance,g=r?.grants?.find(g=>g.designId===p?.designId);
    if(!g||!registered(item)||!globalThis.SoulOpeningWorkshop?.isItemAuthorized(s,item)||g.design.placement!=='worn'||!g.itemIds.includes(item.id)||item.ownerEntityId!==g.ownerId)throw Error('初始佩戴缺少冻结制造来源');
    return {kind:'opening-workshop',sourceId:r.sourceId,designId:g.designId,contractHash:g.contractHash,ownerId:g.ownerId};
  }
  function slotOccupied(s,wearerId,slot,exceptId=''){
    try{globalThis.SoulCustodyCore.assertPartAvailable(s,wearerId,slot,exceptId);}catch{return true;}
    if(Object.values(s.物品?.实例??{}).some(item=>item.id!==exceptId&&item.attachment?.wearerId===wearerId&&item.attachment.slot===slot))return true;
    return (globalThis.SoulHostCore?.hostItems(s,wearerId)??[]).some(item=>item.id!==exceptId&&Object.hasOwn(globalThis.SoulHostCore.read(item).capabilities.forms?.slots??{},slot));
  }
  function sourceContainer(s,item){const c=s.容器?.列表?.[item.containerId];if(!c||!Array.isArray(c.itemIds)||c.itemIds.filter(id=>id===item.id).length!==1)throw Error('佩戴物品缺少唯一实际容器');return c;}
  function destination(s,wearerId){
    const id='container-restraints-'+wearerId,c=s.容器?.列表?.[id];
    if(c&&(c.type!=='restraints'||c.扩展?.wearerId!==wearerId||c.ownerEntityId!==''||!Array.isArray(c.itemIds)))throw Error('佩戴容器与人物不一致');
    if(c&&!c.capacity?.infinite&&c.itemIds.length>=Number(c.capacity?.slots??6))throw Error('佩戴容器已满');
    return c??{id,type:'restraints',ownerEntityId:'',locationId:s.人物.列表[wearerId].locationId,itemIds:[],capacity:{slots:6,infinite:false},status:'active',扩展:{wearerId}};
  }
  // Preserve the pre-existing neutral equipment authorization exactly.
  function permission(frame,type,actorId,targetId,forced,attachment){
    const core=globalThis.SoulIntimateCore;
    if(type==='equip'){
      if(actorId===targetId)return {kind:'self'};
      if(!forced)throw Error('非本人佩戴须明确请求并满足原无反抗能力条件');
      const evidence={custody:false,defeat:false},result=core.defenseless(frame,targetId,evidence);
      if(!result.ok)throw Error('目标仍有反抗能力，不能佩戴');
      return {kind:'defenseless',evidence,result};
    }
    if(attachment.controllers.includes(actorId))return {kind:'controller'};
    if(attachment.wearerId===actorId)return {kind:'wearer'};
    const evidence={custody:true},result=core.defenseless(frame,targetId,evidence);
    if(!result.ok)throw Error('没有解除这件器具的权限');
    return {kind:'defenseless',evidence,result};
  }
  function permissionProof(s,type,q,attachment,initial=false){
    const actorId=q.actorId,targetId=attachment?.wearerId??q.targetId??actorId;
    if(initial)return {kind:'opening-workshop'};
    globalThis.SoulActionContext.resolve(s,{actorId,battleId:null,targetIds:[targetId],requirements:['gesture']});
    const selected=[...new Set([actorId,targetId])],persons={},units={},statuses=[];
    for(const id of selected){const p=s.人物.列表[id],u=s.战斗单位?.列表?.[id];persons[id]={id,status:p.status,inventoryContainerId:p.inventoryContainerId};if(u)units[id]={id,存活状态:u.存活状态,资源:{生命:clone(u.资源.生命)}};
      statuses.push(...globalThis.SoulControlCore.active(s,id).filter(v=>AUTH_STATUS_IDS.includes(v.模板ID)).map(clone));}
    return {kind:'operation',at:now(s),actorId,targetId,forced:q.forced===true,persons,units,statuses,positions:{actor:clone(globalThis.SoulActionContext.positionOf(s,actorId)),target:clone(globalThis.SoulActionContext.positionOf(s,targetId))},decision:permission(s,type,actorId,targetId,q.forced===true,attachment)};
  }
  function quote(s,type,q={},initial=false){
    const item=s.物品?.实例?.[q.itemId],d=definition(item),actorId=q.actorId,targetId=type==='equip'?(q.targetId??actorId):item?.attachment?.wearerId;
    if(!d)throw Error('器具没有登记通用中性佩戴适配');
    if(!s.人物?.列表?.[actorId]||!s.人物?.列表?.[targetId])throw Error('装配需要真实的操作者与佩戴者');
    if(type==='level'){
      if(!item.attachment)throw Error('这件器具当前没有装配');
      if(!item.attachment.controllers.includes(actorId))throw Error('只有控制者能调节档位');
      throw Error('这件器具没有振动档位'); // Existing 0 and nonzero requests both reject.
    }
    if(type==='equip'&&q.level!==undefined&&q.level!==0)throw Error('这件器具仅支持0档');
    const proof=permissionProof(s,type,{...q,targetId},item.attachment,initial),from=sourceContainer(s,item);
    if(type==='equip'){
      if(item.attachment||item.quantity!==1||item.durability<=0||Number(s.世界?.时间?.day??0)>Number(item.payload?.expiresAtDay??Number.MAX_SAFE_INTEGER))throw Error('器具须为未装配且未过期的完好单件');
      const person=s.人物.列表[actorId];
      if(item.ownerEntityId!==actorId||from.id!==person.inventoryContainerId||from.type!=='inventory'||from.ownerEntityId!==actorId)throw Error('操作者须实际持有这件器具');
      const slot=q.slot??d.slots[0];if(!d.slots.includes(slot))throw Error('器具不能装在这个部位');
      if(slotOccupied(s,targetId,slot,item.id))throw Error('该部位已经佩戴其他器具或宿主形态');
      return {type,actorId,targetId,itemId:item.id,slot,level:0,minutes:initial?0:2,from,to:destination(s,targetId),permissionProof:proof};
    }
    const last=latest(s,item.id);
    if(!managed(item)||last?.kind!=='attached'||!same(last.attachment,item.attachment)||item.quantity!==1||from.id!=='container-restraints-'+targetId||from.扩展?.wearerId!==targetId)throw Error('器具缺少实际通用佩戴来源');
    if(type==='detach'){
      if(actorId===targetId&&globalThis.SoulHostCore?.sourceAllowed(s,item)&&globalThis.SoulHostCore.read(item).capabilities.release?.wearerLock)throw Error('这件宿主由控制者锁定，穿戴者无法自行解除');
      const to=s.容器.列表[s.人物.列表[actorId].inventoryContainerId];if(!to||to.type!=='inventory'||to.ownerEntityId!==actorId)throw Error('操作者背包无效');
      if(item.boundToEntityId&&item.boundToEntityId!==actorId)throw Error('绑定物品不能转移给其他角色');
      const placement=globalThis.SoulWorldEngine.previewItemPlacement(s,to.id,item);if(!placement.pass)throw Error(placement.message);
      return {type,actorId,targetId,itemId:item.id,minutes:2,from,to,permissionProof:proof};
    }
    throw Error('通用佩戴操作未登记');
  }
  function event(s,kind,item,q,sourceId,attachment,authority){
    if(typeof sourceId!=='string'||!sourceId)throw Error('通用佩戴缺少操作来源');
    s.扩展??={};const db=s.扩展.wearables??={version:1,events:[]};if(db.version!==1||!Array.isArray(db.events))throw Error('通用佩戴账本无效');
    const e=stamp({id:'wearable:'+(db.events.length+1),kind,itemId:item.id,templateId:item.templateId,actorId:q.actorId,wearerId:attachment.wearerId,at:now(s),order:globalThis.SoulPersonCore.nextEventOrder(s),sourceId,previousHash:db.events.at(-1)?.hash??null,itemProof:clone(item),from:clone(q.from),to:clone(q.to),attachment:clone(attachment),authority:clone(authority),permissionProof:clone(q.permissionProof)});
    db.events.push(e);item.扩展??={};(item.扩展.wearableEventIds??=[]).push(e.id);return e;
  }
  function equip(s,q={},sourceId,initial=false){
    const checked=quote(s,'equip',q,initial),item=s.物品.实例[checked.itemId],authority=initial?initialAuthority(s,item):{kind:'operation'};
    if(initial&&(authority.ownerId!==q.actorId||checked.targetId!==q.actorId||sourceId!==authority.sourceId+':workshop-wear:'+authority.designId))throw Error('初始佩戴来源与接收人物不一致');
    const attachment=stamp({adapter:ADAPTER,wearerId:checked.targetId,slot:checked.slot,level:0,controllers:[q.actorId],sourceId,forced:q.forced===true||q.actorId!==checked.targetId,originKind:initial?'opening-workshop':'operation',attachedBy:q.actorId,attachedAt:now(s)});
    const e=event(s,'attached',item,checked,sourceId,attachment,authority);
    s.容器.列表[checked.to.id]??=checked.to;checked.from.itemIds=checked.from.itemIds.filter(id=>id!==item.id);s.容器.列表[checked.to.id].itemIds.push(item.id);item.containerId=checked.to.id;item.attachment=attachment;
    return {itemId:item.id,weapon:item.name,slot:checked.slot,level:0,forced:attachment.forced,wearableEventId:e.id};
  }
  function attachInitial(s,item,{actorId,sourceId}){return equip(s,{actorId,targetId:actorId,itemId:item.id,level:0},sourceId,true);}
  function detach(s,q={},sourceId){
    const checked=quote(s,'detach',q),item=s.物品.实例[checked.itemId],a=clone(item.attachment),e=event(s,'detached',item,checked,sourceId,a,{kind:'operation'});
    delete item.attachment;globalThis.SoulWorldEngine.transferItem(s,item.id,checked.to.id,1);return {itemId:item.id,worn:false,wearableEventId:e.id};
  }
  /** Capture alone authorizes replacing an old neck item; it never manufactures consent. */
  function replaceForRealm(s,item,actorId,sourceId,captureEventId){
    if(!registered(item)||!managed(item)||!globalThis.SoulCustodyCore.occupiedParts(s,item).includes('neck'))throw Error('只能替换实际佩戴的颈部器具');
    const a=clone(item.attachment),from=sourceContainer(s,item),to=s.容器.列表[s.人物.列表[actorId].inventoryContainerId],checked={actorId,from,to,permissionProof:{kind:'realm-capture',captureEventId}};
    const e=event(s,'detached',item,checked,`${sourceId}:replace:${item.id}`,a,{kind:'realm-capture',captureEventId});
    delete item.attachment;globalThis.SoulWorldEngine.transferItem(s,item.id,to.id,1);return {itemId:item.id,wearableEventId:e.id};
  }
  function setLevel(s,q={}){return quote(s,'level',q);}
  function craftTerms(source,item){
    const fields=['version','sourceId','actorId','templateId','price','startedAt','completedAt'];
    const price=globalThis.SoulIntimateCore?.DEVICES?.[source?.templateId]?.price;
    if(!source||Object.keys(source).some(key=>!fields.includes(key))||fields.some(key=>!Object.hasOwn(source,key))||source.version!==1||typeof source.sourceId!=='string'||!source.sourceId||!registered(source.templateId)||source.templateId!==item?.templateId||source.actorId!==item.ownerEntityId||source.price!==price||!Number.isSafeInteger(source.startedAt)||!Number.isSafeInteger(source.completedAt)||source.startedAt<0||source.startedAt>source.completedAt||source.completedAt-source.startedAt>5||!same(item.provenance,{type:'neutral-wearable-craft',sourceId:source.sourceId,actorId:source.actorId,templateId:source.templateId}))throw Error('中性器具制作缺少原制式费用或实际交付来源');
  }
  function registerCraft(s,item,source){
    craftTerms(source,item);if(source.completedAt!==now(s)||item.quantity!==1||item.durability<=0||item.attachment)throw Error('中性器具制作交付时点或实物无效');
    const p=s.人物.列表[source.actorId],container=sourceContainer(s,item),wallet=s.钱包.列表[p?.walletId];
    if(!p||container.id!==p.inventoryContainerId||container.ownerEntityId!==p.id||container.type!=='inventory'||!wallet||!Number.isSafeInteger(wallet.gold)||wallet.gold<0)throw Error('中性器具制作缺少本人实际行囊与钱袋');
    s.扩展??={};const db=s.扩展.wearables??={version:1,events:[]};if(db.version!==1||!Array.isArray(db.events))throw Error('通用佩戴账本无效');
    const rows=db.crafts??=[];if(!Array.isArray(rows))throw Error('中性器具制作账本无效');if(rows.some(e=>e.source.sourceId===source.sourceId||e.itemProof.id===item.id))throw Error('中性器具制作来源已经登记');
    const row=stamp({id:'wearable-craft:'+source.sourceId,source:clone(source),itemProof:clone(item),wallet:{id:p.walletId,before:wallet.gold+source.price,after:wallet.gold},previousHash:rows.at(-1)?.hash??null});rows.push(row);return clone(row);
  }
  function route(s,type,q){return registered(s.物品?.实例?.[q.itemId]);}
  function wornItems(s,id,candidates=Object.values(s.物品?.实例??{})){return candidates.filter(item=>registered(item)&&item.attachment?.wearerId===id);}
  function project(s,item){
    const d=definition(item),a=item?.attachment,c=s.容器?.列表?.[item?.containerId],e=latest(s,item?.id);
    const active=!!(d&&managed(item)&&item.quantity===1&&item.durability>0&&Number(s.世界?.时间?.day??0)<=Number(item.payload?.expiresAtDay??Number.MAX_SAFE_INTEGER)&&s.人物?.列表?.[a.wearerId]?.status!=='dead'&&c?.扩展?.wearerId===a.wearerId&&c.itemIds?.includes(item.id)&&e?.kind==='attached'&&same(e.attachment,a));
    return {restrictions:active?{...d.restrictions}:{}};
  }
  function worn(s,id){return wornItems(s,id).map(item=>({id:item.id,name:item.name,icon:definition(item).icon,templateId:item.templateId,slot:item.attachment.slot,level:0,forced:item.attachment.forced===true,concealment:0,controller:item.attachment.controllers[0]}));}
  function validatePermission(e,s){
    const p=e.permissionProof;
    if(e.authority.kind==='opening-workshop'){if(!same(p,{kind:'opening-workshop'}))throw Error('初装权限证明');return;}
    if(e.authority.kind==='realm-capture'){if(e.kind!=='detached'||!same(p,{kind:'realm-capture',captureEventId:e.authority.captureEventId})||!globalThis.SoulRealmArrangements?.validReplacement(s,{captureEventId:e.authority.captureEventId},e.itemId))throw Error('颈部替换缺少真实收入来源');return;}
    if(p?.kind!=='operation'||p.at!==e.at||p.actorId!==e.actorId||p.targetId!==e.wearerId||typeof p.forced!=='boolean'||!Array.isArray(p.statuses)||!p.persons?.[e.actorId]||!p.persons?.[e.wearerId])throw Error('操作权限上下文');
    const actor=p.units?.[e.actorId];if(p.persons[e.actorId].id!==e.actorId||p.persons[e.actorId].status==='dead'||actor&&(actor.id!==e.actorId||actor.存活状态!=='存活'||actor.资源?.生命?.当前<=0))throw Error('操作人已失能');
    if(!same(p.positions.actor,p.positions.target)||p.positions.actor?.kind==='contained')throw Error('操作现场不可触及');
    const statusIds=new Set();for(const status of p.statuses){
      if(statusIds.has(status.id)||![e.actorId,e.wearerId].includes(status.目标单位ID)||!AUTH_STATUS_IDS.includes(status.模板ID)||!globalThis.SoulCombatEngine.validateControlSourceProof(status,status.目标单位ID,e.at))throw Error('权限状态缺少真实历史来源');statusIds.add(status.id);
    }
    const frame={人物:{列表:p.persons},战斗单位:{列表:p.units},状态实例:{列表:Object.fromEntries(p.statuses.map(v=>[v.id,v]))}};
    if(globalThis.SoulControlCore.active(frame,e.actorId).some(v=>['status.sleep','status.stun'].includes(v.模板ID))||globalThis.SoulControlCore.restrictions(frame,e.actorId).blocked.gesture?.length)throw Error('操作人须清醒且能使用手部');
    const type=e.kind==='attached'?'equip':'detach';
    if(!same(permission(frame,type,e.actorId,e.wearerId,p.forced,e.kind==='attached'?undefined:e.attachment),p.decision))throw Error('原权限判断与冻结依据不一致');
    if(e.kind==='attached'&&e.attachment.forced!==(p.forced||e.actorId!==e.wearerId))throw Error('佩戴请求与实际依据不一致');
  }
  function validateState(s){
    const errors=[],db=table(s),items=Object.values(s.物品?.实例??{}),marked=items.filter(i=>registered(i)&&i.attachment||i.扩展?.wearableEventIds!==undefined);
    if(!db){if(marked.length)errors.push('通用佩戴缺少生命周期账本');}
    else if(db.version!==1||!Array.isArray(db.events))errors.push('通用佩戴账本结构无效');
    const crafts=Array.isArray(db?.crafts)?db.crafts:[],craftIds=new Set(),craftedItems=new Set();let craftPreviousHash=null;
    if(db?.crafts!==undefined&&!Array.isArray(db.crafts))errors.push('中性器具制作账本无效');
    for(const row of crafts)try{
      const source=row?.source,proof=row?.itemProof,item=s.物品?.实例?.[proof?.id];craftTerms(source,proof);
      if(!valid(row)||row.id!=='wearable-craft:'+source.sourceId||craftIds.has(row.id)||craftedItems.has(proof.id)||row.previousHash!==craftPreviousHash||source.completedAt>now(s)||!s.人物?.列表?.[source.actorId]||row.wallet?.id!==s.人物.列表[source.actorId].walletId||!Number.isSafeInteger(row.wallet.before)||!Number.isSafeInteger(row.wallet.after)||row.wallet.after<0||row.wallet.before-row.wallet.after!==source.price||proof.quantity!==1||proof.durability<=0||proof.attachment||proof.containerId!==s.人物.列表[source.actorId].inventoryContainerId||!item||item.templateId!==source.templateId||!same(item.provenance,proof.provenance))throw Error('实际交付、钱袋或来源链');
      const receipt=s.世界?.processedTransactions?.[source.sourceId];if(receipt&&(receipt.type!=='intimate-craft'||receipt.actorId!==source.actorId||receipt.itemId!==proof.id||receipt.gold!==source.price||!same(receipt.craftSource,source)))throw Error('制作原始回执');
      craftIds.add(row.id);craftedItems.add(proof.id);craftPreviousHash=row.hash;
    }catch(error){errors.push('中性器具制作'+row?.id+'无效：'+error.message);}
    for(const item of items)if(item.provenance?.type==='neutral-wearable-craft'&&!craftedItems.has(item.id))errors.push('中性器具'+item.id+'缺少实际制作来源');
    const events=Array.isArray(db?.events)?db.events:[],byItem=new Map(),ids=new Set();let previousHash=null,previousAt=-1,previousOrder=0;
    for(const [index,e] of events.entries())try{
      const item=s.物品?.实例?.[e.itemId],d=definition({templateId:e.templateId}),a=e.attachment,prior=byItem.get(e.itemId);
      if(!item||!d||item.templateId!==e.templateId||!valid(e)||e.id!=='wearable:'+(index+1)||ids.has(e.id)||e.previousHash!==previousHash||!Number.isSafeInteger(e.at)||e.at<previousAt||e.at>now(s)||!Number.isSafeInteger(e.order)||e.order<=previousOrder||e.order>s.扩展.personEventSequence||!s.人物.列表[e.actorId]||!s.人物.列表[e.wearerId])throw Error('事件来源或顺序');
      if(!valid(a)||a.adapter!==ADAPTER||a.wearerId!==e.wearerId||!d.slots.includes(a.slot)||a.level!==0||typeof a.forced!=='boolean'||!Array.isArray(a.controllers)||a.controllers.length!==1||a.controllers[0]!==a.attachedBy||typeof e.sourceId!=='string'||!e.sourceId||e.itemProof?.id!==e.itemId||e.itemProof.templateId!==e.templateId)throw Error('附件定义');
      if(e.kind==='attached'){
        if(prior?.kind==='attached'||a.attachedBy!==e.actorId||a.attachedAt!==e.at||a.sourceId!==e.sourceId||e.itemProof.attachment||e.itemProof.ownerEntityId!==e.actorId||e.itemProof.quantity!==1||e.itemProof.durability<=0||e.itemProof.containerId!==e.from.id||e.from.type!=='inventory'||e.from.ownerEntityId!==e.actorId||e.from.itemIds.filter(id=>id===e.itemId).length!==1||e.to.id!=='container-restraints-'+e.wearerId||e.to.扩展?.wearerId!==e.wearerId)throw Error('实际初装或重装');
        if(e.authority?.kind==='opening-workshop'){const authority=initialAuthority(s,e.itemProof);if(!same(authority,e.authority)||e.sourceId!==authority.sourceId+':workshop-wear:'+authority.designId||a.originKind!=='opening-workshop'||e.actorId!==e.wearerId||a.forced)throw Error('冻结初装授权');}
        else if(!same(e.authority,{kind:'operation'})||a.originKind!=='operation')throw Error('装配授权');
      }else if(e.kind==='detached'){
        if(prior?.kind!=='attached'||!same(prior.attachment,a)||!same(e.itemProof.attachment,a)||e.from.id!=='container-restraints-'+e.wearerId||e.from.itemIds.filter(id=>id===e.itemId).length!==1||!(same(e.authority,{kind:'operation'})||e.authority?.kind==='realm-capture')||e.to.type!=='inventory'||e.to.ownerEntityId!==e.actorId)throw Error('拆除来源或容器');
      }else throw Error('未登记事件');
      validatePermission(e,s);ids.add(e.id);previousHash=e.hash;previousAt=e.at;previousOrder=e.order;byItem.set(e.itemId,e);
    }catch(error){errors.push('通用佩戴事件'+e?.id+'无效：'+error.message);}
    for(const item of items){
      const history=events.filter(e=>e.itemId===item.id).map(e=>e.id),refs=item.扩展?.wearableEventIds;
      if(history.length||refs!==undefined)if(!Array.isArray(refs)||!same(history,refs))errors.push('器具'+item.id+'佩戴事件引用不一致');
      const e=byItem.get(item.id);if(e?.kind==='attached'&&(!managed(item)||!same(item.attachment,e.attachment)))errors.push('器具'+item.id+'并非最新实际佩戴');
      if(registered(item)&&item.attachment){const a=item.attachment,c=s.容器?.列表?.[item.containerId];if(!managed(item)||e?.kind!=='attached'||item.ownerEntityId!==e.itemProof.ownerEntityId||item.quantity!==1||!s.人物?.列表?.[a.wearerId]||c?.id!=='container-restraints-'+a.wearerId||c.type!=='restraints'||c.ownerEntityId!==''||c.扩展?.wearerId!==a.wearerId||c.itemIds.filter(id=>id===item.id).length!==1||slotOccupied(s,a.wearerId,a.slot,item.id))errors.push('器具'+item.id+'通用装配无效');}
    }
    for(const g of s.扩展?.openingWorkshop?.grants??[])if(g.design?.placement==='worn'&&registered(g.design.definition?.templateId))for(const id of g.itemIds)if(!events.some(e=>e.itemId===id&&e.kind==='attached'&&e.authority?.kind==='opening-workshop'))errors.push('中性初始佩戴'+id+'缺少实际制造装配事件');
    for(const receipt of Object.values(s.世界?.processedTransactions??{}))if(receipt.wearableEventId&&!events.some(e=>e.id===receipt.wearableEventId&&e.sourceId===receipt.id))errors.push('通用佩戴操作缺少对应生命周期事件');
    return errors;
  }
  return Object.freeze({ADAPTER,REGISTRY,registered,managed,definition,initialAuthority,slotOccupied,permission,quote,route,equip,attachInitial,detach,replaceForRealm,setLevel,registerCraft,wornItems,worn,project,validateState});
});
