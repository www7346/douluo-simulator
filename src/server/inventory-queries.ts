import {auctionConsignmentQuote} from '../runtime/auction-quote';
import {intimateItemPresentation} from '../runtime/intimate-item-presentation';
import {inventoryGroups} from './inventory-groups';
import {playerIntentDefaults} from '../runtime/player-action-defaults';
import {assertWorldCommandActor} from '../runtime/world-command-actor';
import {playerDescription} from '../runtime/player-copy';
import {rewardName,ringLore,rewardDescription} from './reward-presentation';
import {rules} from '../rules';
import {CloudError} from '../cloud/protocol';
import {materialFacts,materialSummaries} from '../runtime/player-presentation';
import {playerText,materialName} from '../runtime/player-text';
import {abilityPresentation} from '../runtime/ability-presentation';
import {restraintPresentation} from '../runtime/restraint-presentation';
import {medicineActionOptions} from '../runtime/medicine-action-options';

export function inventoryQuery(state:any,name:string,input:Record<string,any>):unknown {
  const preview=(intent:any)=>{try{assertWorldCommandActor(state,intent);if(rules.poison.INTENTS.includes(intent.type)&&rules.actions.battleOf(state,intent.actorId??state.角色.主控单位ID)){const {type,...params}=intent,q=rules.combat.previewAction(state,{...params,actorId:intent.actorId??state.角色.主控单位ID,type:'药剂施用',operation:type});return {...q,available:q.ready};}return rules.world.previewIntent(state,playerIntentDefaults(state,intent));}catch(error){return {available:false,reason:playerText((error as Error).message,state)};}};
  switch(name){
    case 'inventory.trade-maximum':{
      assertWorldCommandActor(state,input);
      const direction=input.direction,shopId=input.shopId;
      if(!['buy','sell'].includes(direction)||typeof shopId!=='string')throw Error('请选择交易方向与商店');
      const identity=(r:any)=>({kind:r.kind,...(r.kind==='item'?{itemId:r.itemId}:{fingerprint:r.fingerprint})});
      const key=(r:any)=>JSON.stringify(identity(r));
      const bound=(row:any)=>{
        if(!['item','material'].includes(row?.kind))throw Error('请选择实际物品或材料');
        const quantity=row.kind==='item'?state.物品.实例[row.itemId]?.quantity:direction==='sell'?state.材料库?.永久?.[row.fingerprint]?.quantity:state.商店?.列表?.[shopId]?.扩展?.materialStock?.[row.fingerprint]?.quantity;
        return Math.min(999,Math.max(0,Number.isSafeInteger(quantity)?quantity:0));
      };
      const fill=(row:any,prior:any[])=>{
        const base=prior.filter(r=>key(r)!==key(row)),test=(quantity:number)=>{try{return rules.world.previewBatchTrade(state,{direction,shopId,lines:[...base,{...identity(row),quantity}]}).pass!==false;}catch{return false;}};
        const stock=bound(row);
        // A complete available stack is the common case for recycling materials.
        if(stock>0&&test(stock))return stock;
        return maximumQuantity(stock-1,test);
      };
      if(input.all!==undefined){
        if(direction!=='sell'||!Array.isArray(input.all)||input.all.length>100)throw Error('一次最多回收100种物资');
        const lines:any[]=[];for(const row of input.all){if(lines.some(r=>key(r)===key(row)))throw Error('物资重复');const quantity=fill(row,lines);if(quantity)lines.push({...identity(row),quantity});}
        return {lines};
      }
      if(!Array.isArray(input.lines)||input.lines.length>100||!input.target)throw Error('请先选择交易物资');
      return {maximum:fill(input.target,input.lines)};
    }
    case 'inventory.economy-maximum':{
      if(input.actorId!==undefined&&input.actorId!==state.角色.主控单位ID)throw Error('只能查看本人的数量');
      if(input.type==='blueprint.craft'){
        try{
          if(input.includeQuote!==true)return {maximum:rules.expedition.maximumBlueprintCraftQuantityPrepared(state,input.blueprintId,999)};
          const quote=blueprintQuote(state,input.blueprintId,undefined,999);
          return quote.pass&&quote.quantity?{maximum:quote.quantity,quote}:{maximum:0};
        }
        catch{return {maximum:0};}
      }
      return {maximum:maximumQuantity(999,quantity=>(inventoryQuery(state,'inventory.economy',{...input,quantity}) as any).pass===true)};
    }
    case 'inventory.trade-batch':{
      try{assertWorldCommandActor(state,input);return rules.world.previewBatchTrade(state,input);}catch(e){return {pass:false,message:playerText((e as Error).message,state)};}
    }
    case 'inventory.action':return {...preview(input),equipmentSlots:rules.world.EQUIPMENT_SLOTS};
    case 'inventory.item':{
      const item=input.item,details=rules.world.inspectItem(state,item),ring=rules.cycle.isRingItem(item)?rules.cycle.ringItemFacts(item):null;
      const device=rules.custody.resolveDevice(item);
      const restraint=device?restraintPresentation(item.payload?.restraint??{kind:'registered-restraint',templateId:item.templateId,contractHash:rules.abilities.hash(device)},item):null;
      const passive=details.passiveEffectGraph?{id:`item-defense:${item.id}`,name:item.type==='魂骨'?'魂骨庇护':'装备被动',category:item.type,sourceItemId:item.id,effectGraph:details.passiveEffectGraph}:null;
      const consumable=details.skills.map((skill:any)=>rules.abilities.consumableDisposition(skill)).find((entry:any)=>entry?.harmful)??null;
      const medicine=details.skills.find((skill:any)=>skill.medicine)?.medicine,actorId=state.角色.主控单位ID;
      const battle=rules.actions.battleOf(state,actorId),medicineOptions=medicineActionOptions(state,item,actorId);
      const fieldUse=rules.world.isCarriedItem(state,item,actorId)&&!battle&&(!medicine||medicine.route==='oral')&&details.skills.some((s:any)=>state.战斗单位.列表[actorId].能力.技能ID.includes(s.id)&&rules.abilities.fieldControlGraph(s.effectGraph));
      const blueprintBook=item.payload?.blueprintBook?{...rules.expedition.presetBlueprintAccess(state,item.payload.blueprintBook.presetId),study:(()=>{try{return rules.expedition.previewLearnPresetBlueprint(state,item.id);}catch(error){return {available:false,reason:(error as Error).message};}})()}:null;
      return {...details,blueprintBook,intimate:intimateItemPresentation(item),restraint,consumable,medicineOptions,fieldUse,name:rewardName(item),description:playerDescription(rewardDescription(item)??details.description),lore:ring?ringLore(item,state.魂兽档案?.列表?.[item.payload?.ringPreparation?.profileId]):null,ring,skills:details.skills.map((skill:any)=>({...skill,displayInfo:abilityPresentation(skill,state)})),passiveInfo:passive?abilityPresentation(passive,state):null};
    }
    case 'inventory.index':{
      const section=input.section??'items';
      if(Object.keys(input).some(key=>key!=='section')||!['items','materials','blueprints','stored','summary'].includes(section))throw new CloudError('invalid-query','请选择行囊分类');
      const id=state.角色?.主控单位ID,person=state.人物?.列表?.[id];if(!person)return null;
      const items=(state.容器.列表[person.inventoryContainerId]?.itemIds??[]).map((itemId:string)=>state.物品.实例[itemId]).filter(Boolean) as any[],materials=(Object.values(state.材料库?.永久??{}) as any[]).filter(material=>material.quantity>0);
      const owned=items.filter(item=>rules.world.isCarriedItem(state,item,id)),keyBlueprints=rules.deviceKeyManufacturing.blueprints(state,id).map((bp:any)=>({...bp,category:'钥匙',description:'通过实际解析取得的对应锁结构，可消耗材料制造实体钥匙。'})),blueprints=[...(Object.values(state.研发?.蓝图??{}) as any[]).filter(entry=>entry.ownerId===id),...keyBlueprints,...(section==='blueprints'?rules.expedition.presetBlueprints(state,id):[])];
      const stored=section==='stored'?rules.expedition.listStoredItems(state):[],metadata:any[]=section==='items'?items:stored.map((v:any)=>state.物品.实例[v.itemId]).filter(Boolean);
      const storedCount=(Object.values(state.容器.列表) as any[]).filter(container=>container.type==='location-stash'&&container.ownerEntityId===id).reduce((count,container)=>count+container.itemIds.filter((itemId:string)=>!!state.物品.实例[itemId]).length,0);
      return {itemGroups:section==='items'?inventoryGroups(state,owned):[],itemKinds:section==='items'?Object.fromEntries(items.map(item=>[item.id,rules.custody.DEVICES[item.templateId]?'拘束器':item.type==='毒药'||['丹药','辅助食品','消耗品'].includes(item.type)&&rules.world.inspectItem(state,item).skills.some((s:any)=>rules.abilities.consumableDisposition(s)?.harmful)?'毒药':item.type])):{},itemNames:Object.fromEntries(metadata.map(item=>[item.id,rewardName(item)])),ownedIds:owned.map(item=>item.id),itemGrades:Object.fromEntries(metadata.map(item=>[item.id,rules.world.itemGrade(item)])),
        ringIds:section==='items'?items.filter(item=>rules.cycle.isRingItem(item)).map(item=>item.id):[],stored,service:rules.expedition.serviceAtLocation(state),
        ...(section==='blueprints'?{deviceTemplates:Object.entries(rules.intimate.DEVICES).map(([templateId,device]:any)=>({id:templateId,name:device.name,price:device.price})),gold:state.钱包?.列表?.[person.walletId]?.gold??0}:{}),
        presetBlueprints:section==='blueprints'?blueprints.filter((bp:any)=>!state.研发?.蓝图?.[bp.id]&&bp.knowledgeOrigin?.kind==='preset-catalogue'):[],keyBlueprints:section==='blueprints'?keyBlueprints:[],blueprintGrades:section==='blueprints'?Object.fromEntries(blueprints.map(entry=>[entry.id,rules.world.itemGradeFromValue(entry.productValue)])):{},
        materials:section==='materials'?materialSummaries(materials,state):{},
        preparedPills:section==='items'?rules.combat.preparedPillViews(state,id):[],
        counts:{items:owned.length,materials:materials.length,blueprints:blueprints.length,stored:storedCount},
        currency:rules.world.formatCurrency(state.钱包?.列表?.[person.walletId]?.gold??0)};
    }
    case 'inventory.selected-use':{
      const id=state.角色.主控单位ID,item=state.物品.实例[String(input.itemId??'')];
      if(!item||!rules.world.isCarriedItem(state,item,id))return null;
      const details=rules.world.inspectItem(state,item),direct=!!medicineActionOptions(state,item,id)||details.skills.some((s:any)=>state.战斗单位.列表[id].能力.技能ID.includes(s.id)&&rules.abilities.fieldControlGraph(s.effectGraph));
      return {direct,restoration:direct?null:preview({type:'use-restorative-item',itemId:item.id}),preparation:!direct&&item.type==='丹药'?preview({type:'use-prebattle-pill',itemId:item.id}):null};
    }
    case 'inventory.medicine':{
      const id=state.角色.主控单位ID,person=state.人物.列表[id];if(!person)return null;
      const owned=(state.容器.列表[person.inventoryContainerId]?.itemIds??[]).map((v:string)=>state.物品.实例[v]).filter((item:any)=>item&&rules.world.isCarriedItem(state,item,id));
      const poisonFacts=rules.poison.facts(state,id),coatedIds=new Set(poisonFacts.sources.filter((v:any)=>v.status==='active'&&v.carrier.kind==='coating').map((v:any)=>v.carrier.itemId));
      return {poisonFacts,medicineBattleId:rules.actions.battleOf(state,id)?.id??null,
        foods:owned.filter((item:any)=>{try{rules.world.supportFoodCarrier(state,item,{allowPoisoned:true});return true;}catch{return false;}}).map((item:any)=>({id:item.id,name:rewardName(item)})),
        medicines:owned.filter((item:any)=>coatedIds.has(item.id)||rules.world.inspectItem(state,item).skills.some((skill:any)=>skill.medicine)).map((item:any)=>({id:item.id,name:rewardName(item),coated:coatedIds.has(item.id)}))};
    }
    case 'inventory.auction-quote':{
      if(Object.keys(input).some(key=>!['assetKind','itemId','targetId','fingerprint','quantity'].includes(key)))throw Error('拍卖估价只接受所选拍品与数量');
      return auctionConsignmentQuote(state,input);
    }
    case 'inventory.services':{
      const visualAvailable=!rules.controls.restrictions(state,state.角色?.主控单位ID).blocked.vision?.length;
      const locationId=state.地图?.当前地点ID,shops=(Object.values(state.商店?.列表??{}) as any[]).filter(shop=>visualAvailable&&shop.locationId===locationId&&shop.status==='open'&&!shop.infinite&&!shop.扩展?.regional);
      const quotations:Record<string,any>={},grades:Record<string,any>={};
      for(const shop of shops)for(const itemId of state.容器.列表[shop.stockContainerId]?.itemIds??[]){const item=state.物品.实例[itemId];if(!item)continue;grades[itemId]=rules.world.itemGrade(item);try{quotations[shop.id+':'+itemId]=rules.world.quotePrice(state,shop.id,itemId,'buy',1,{actorId:state.角色.主控单位ID});}catch{quotations[shop.id+':'+itemId]=null;}}
      return {visualAvailable,service:rules.expedition.serviceAtLocation(state),cityBusiness:rules.world.cityStageFacts(state).find((c:any)=>c.locationId===locationId)??null,quotations,grades,
        supplies:visualAvailable?(rules.expedition.supplyOffers(state) as any[]).map(entry=>({...entry,item:state.物品.实例[entry.itemIds?.[0]],material:entry.kind==='material'?state.商店.列表[entry.shopId].扩展.materialStock[entry.fingerprint]:null,type:entry.kind==='material'?'材料':state.物品.实例[entry.itemIds?.[0]]?.type??rules.world.ITEM_TEMPLATES[entry.templateId]?.type})):[],
        supplyOrders:rules.stock.table(state).orders.filter((o:any)=>o.shopId===rules.expedition.serviceAtLocation(state)?.id&&o.status==='ordered').map((o:any)=>({id:o.id,arrivesAt:o.arrivesAt,lines:o.lines.map((l:any)=>({name:rules.world.ITEM_TEMPLATES[l.templateId].name,quantity:l.quantity}))})),
        recipes:Object.fromEntries(Object.entries(rules.world.SUPPORT_CONSUMABLE_RECIPES).map(([id,entry]:[string,any])=>[id,{name:entry.name,soulPowerCost:entry.soulPowerCost,shelfLifeDays:entry.shelfLifeDays,dailyLimit:entry.dailyLimit,worldCooldownDays:entry.worldCooldownDays}]))};
    }
    case 'inventory.auction':return {
        auction:rules.commerceAuction.facts(state,undefined,{includeCatalog:input.includeCatalog===true,includeItemDetails:false}),auctionItems:input.includeConsign===true?(Object.values(state.物品.实例) as any[]).filter(v=>rules.world.isCarriedItem(state,v,state.角色.主控单位ID)&&!rules.commerceAssets.itemReason(state,v,state.角色.主控单位ID)).map(v=>{const assetKind=rules.sealing.byItem(state,v.id)?'loaded-seal':'item',auctionQuote=auctionConsignmentQuote(state,{assetKind,itemId:v.id,quantity:1});return {id:v.id,name:v.name,type:v.type,quantity:v.quantity,valueGold:auctionQuote.valueGold??rules.world.currentItemValue(v),assetKind,auctionQuote};}).concat(Object.entries(state.材料库.永久).map(([fingerprint,v]:[string,any])=>({id:'material:'+fingerprint,fingerprint,name:materialName(v,state),type:'材料',quantity:v.quantity,valueGold:v.unitValue,assetKind:'material',auctionQuote:auctionConsignmentQuote(state,{assetKind:'material',fingerprint,quantity:1})})),Object.values(rules.custody.table(state).byPerson).filter((c:any)=>c.status==='held'&&c.custodianId===state.角色.主控单位ID&&c.arrangement==='held-at-scene'&&rules.actions.colocated(state,c.personId,state.角色.主控单位ID)).map((c:any)=>{const auctionQuote=auctionConsignmentQuote(state,{assetKind:'person',targetId:c.personId,quantity:1});return {id:'person:'+c.personId,name:state.人物.列表[c.personId].name,type:'奴隶',quantity:1,valueGold:auctionQuote.valueGold??rules.commerceDesigns.personValue(state,c.personId),assetKind:'person',targetId:c.personId,auctionQuote};})):[]};
    case 'inventory.auction-item':{if(typeof input.auctionId!=='string')throw Error('请选择拍品');return rules.commerceAuction.facts(state,undefined,{includeCatalog:false,includeItemDetails:true,lotId:input.auctionId}).lots[0]?.item??null;}
    case 'inventory.message-count':{if(Object.keys(input).length)throw Error('商业留言只读取本人记录');return {unread:rules.commerceMessages.unreadCount(state)};}
    case 'inventory.messages':{if(Object.keys(input).length)throw Error('商业留言只读取本人记录');return rules.commerceMessages.facts(state);}
    case 'inventory.economy':{
      try{
        if(input.actorId!==undefined&&input.actorId!==state.角色.主控单位ID)throw Error('只能查看本人的采购与财物报价');
        if(input.type==='blueprint.craft')return blueprintQuote(state,input.blueprintId,input.quantity);
        const result=['buy','sell'].includes(input.type)?rules.world.previewIntent(state,input).quote:rules.expedition.previewEconomy(state,input);
        return {...result,pass:result.pass??true,totalCurrency:result.totalGold===undefined?undefined:rules.world.formatCurrency(result.totalGold),remainingCurrency:result.remainingGold===undefined?undefined:rules.world.formatCurrency(result.remainingGold)};
      }catch(error){return {pass:false,message:playerText((error as Error).message,state,'请检查数量和所在地点')};}
    }
    default:throw new CloudError('invalid-query','不支持这项物品查看');
  }
}

function blueprintQuote(state:any,blueprintId:unknown,quantity:unknown,limit?:number){
  const quote=rules.expedition.previewBlueprintCraftPrepared(state,blueprintId,{quantity,includeMaximum:false},{},limit);
  const materialDetails=quote.pass?Object.fromEntries(quote.allocations.map(({fingerprint}:{fingerprint:string})=>[fingerprint,materialFacts(state.材料库.永久[fingerprint],state)])):undefined;
  return {...quote,...(materialDetails?{materialDetails}:{}),totalCurrency:undefined,remainingCurrency:undefined};
}

/** Native trade/craft costs, stock and required slots are monotone in quantity. */
function maximumQuantity(bound:number,pass:(quantity:number)=>boolean):number{
 if(bound<1||!pass(1))return 0;
 let low=1,high=bound;while(low<high){const middle=Math.ceil((low+high)/2);if(pass(middle))low=middle;else high=middle-1;}return low;
}
