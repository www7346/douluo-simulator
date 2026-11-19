import {rules} from '../rules';
import {abilityWritingMeaning,researchAbilityWritingSource} from './ability-writing';
import {storyWritingPersonReferences} from './story-writing-person-scope';

/** Read the existing frozen quoted item with the same item compiler used by its dossier.
 * This creates no item, payment, skill, eligibility or persistent gameplay variable. */
export function commerceQuoteReading(item:any){
 if(!item)return null;
 const details=rules.world.inspectItem({},item),payload=item.payload??{},ring=rules.cycle.isRingItem(item)?rules.cycle.ringItemFacts(item):null;
 const source=payload.ringSource,bloodline=payload.sourceBloodline?.compiled??source?.profile?.血脉?.compiled;
 const attributes=ring?.attributes??(bloodline?.attributes??[]).map((a:any)=>a.name);
 const index={grade:details.grade,tags:rules.world.ITEM_TEMPLATES[item.templateId]?.tags??[],attributes,
  ...(ring?{ring}:{}),...(payload.years!==undefined?{years:payload.years}:{}),...(payload.slot?{slot:payload.slot}:{}),...(payload.tier?{tier:payload.tier}:{}),
  source:{kind:source?.kind??item.type,sourceId:source?.sourceId??payload.sourceProfileId??null,profileName:source?.profile?.名称??null},
  channels:(bloodline?.channels??[]).map((c:any)=>({id:c.id??c.name,name:c.name??rules.martialSoul.CHANNEL_REGISTRY[c.id]?.name??c.id}))};
 const registeredActive=payload.activeSkill??rules.world.ITEM_TEMPLATES[item.templateId]?.activeSkill;
 const activeDevice=registeredActive&&registeredActive.soulPowerCost>0&&registeredActive.durabilityCost>0
  &&rules.abilities.activeDeviceGraph(registeredActive.effectGraph??rules.effects.makeLinearGraph(registeredActive.effectSpecs),{fixedForm:payload.fixedForm??rules.world.ITEM_TEMPLATES[item.templateId]?.fixedForm});
 const skills=(details.skills??[]).map((skill:any)=>({id:skill.id,name:skill.名称??skill.name,
  requirements:skill.requirements,resourceCosts:skill.resourceCosts,maintenanceCosts:skill.maintenanceCosts,castModes:skill.castModes,
  defaultCastMode:skill.defaultCastMode,usageRules:skill.usageRules,
  meaning:abilityWritingMeaning(skill,item.type==='魂骨'?'bone':researchAbilityWritingSource(item.type,{sourceKind:item.type==='魂导器'?(activeDevice?'soul-device':undefined):skill.sourceKind}))}));
 const passive=details.passiveEffectGraph?.nodes?.length?abilityWritingMeaning({effectGraph:details.passiveEffectGraph,modifiers:details.modifiers},'device'):null;
 return {index,details:{description:details.description,form:details.form,fixedForm:details.fixedForm,modifiers:details.modifiers,
  passiveCombat:details.passiveCombat,skills,passive,durability:details.durability,maxDurability:details.maxDurability,
  expiresAtDay:details.expiresAtDay}};
}

export function commerceFocusedLotIds(auctions:any,input:string,references:Iterable<string>=[]){
 const refs=new Set(references),ids=new Set<string>();
 for(const lot of auctions?.lots??[])if([lot.id,lot.itemId,lot.personId].some(id=>typeof id==='string'&&refs.has(id))
  ||[lot.id,lot.itemId,lot.name,lot.item?.name].some(name=>typeof name==='string'&&name&&input.includes(name)))ids.add(lot.id);
 return ids;
}

/** All quote/status/permissions/escrow/proxy/care fields stay intact. Raw item
 * construction/pricing graphs remain in the original dossier; focused items use
 * the full official reading and declared conditions, others use its source index. */
export function projectCommerceAuctionReadings(auctions:any,input:string,references:Iterable<string>=[]){
 if(!auctions)return auctions;
 const copy=structuredClone(auctions),focused=commerceFocusedLotIds(copy,input,references);
 for(const lot of copy.lots??[]){
  lot.quoteReading??=commerceQuoteReading(lot.item);
  lot.detailLookup??={kind:'inspect-commerce',auctionId:lot.id};
  if(lot.item)delete lot.item.payload;
  if(focused.has(lot.id))continue;
  if(lot.quoteReading){delete lot.quoteReading.details;delete lot.quoteReading.index.channels;}
 }
 return copy;
}

/** The author/reviewer select existing canonical fields only. No derived reading
 * is inserted into a package or receives a synthetic fact-reference coordinate. */
export function projectCommerceAuctionFacts(auctions:any,input:string,references:Iterable<string>=[]){
 if(!auctions)return auctions;
 const copy=structuredClone(auctions),focused=commerceFocusedLotIds(copy,input,references);
 for(const lot of copy.lots??[])if(!focused.has(lot.id)&&lot.item)delete lot.item.payload;
 return copy;
}

/** Supplemental dossier reading, tied to the original quoted-item source path.
 * Exact scalar/evidence tokens continue to refer to canonical writingFacts. */
export function commerceWritingReadings(sourceFacts:any,selectedFacts:any){
 const readings:any[]=[];
 const add=(source:any,selected:any,path:string)=>{
  if(!source?.auctions||!selected?.auctions)return;
  for(const [index,lot]of selected.auctions.lots.entries()){
   const original=source.auctions.lots[index];if(!original||original.id!==lot.id)throw Error('拍品读物与原来源身份不符');
   const full=commerceQuoteReading(original.item),reading=full&&!lot.item?.payload?{index:Object.fromEntries(Object.entries(full.index).filter(([key])=>key!=='channels'))}:full;
   readings.push({auctionId:lot.id,sourcePath:path+'/auctions/lots/'+index+'/item',reading,detailLookup:{kind:'inspect-commerce',auctionId:lot.id}});
  }
 };
 add(sourceFacts.continuity?.commerce,selectedFacts.continuity?.commerce,'/continuity/commerce');
 for(const [index,event]of selectedFacts.events.entries())if(event.action==='inspect-commerce')add(sourceFacts.events[index].facts.data,event.facts.data,'/events/'+index+'/facts/data');
 return readings;
}

export function projectCommerceWritingFacts(input:any){
 const facts=structuredClone(input),references=storyWritingPersonReferences(facts.events.filter((event:any)=>event.action!=='inspect-commerce'),facts.changes),text=facts.events.map((event:any)=>event.intent).join('\n');
 for(const event of facts.events)if(event.action==='inspect-commerce'&&event.status==='执行成功'&&event.facts.data?.auctions?.lots?.length===1)references.add(event.facts.data.auctions.lots[0].id);
 if(facts.continuity.commerce?.auctions)facts.continuity.commerce.auctions=projectCommerceAuctionFacts(facts.continuity.commerce.auctions,text,references);
 for(const event of facts.events)if(event.action==='inspect-commerce'&&event.facts.data?.auctions)event.facts.data.auctions=projectCommerceAuctionFacts(event.facts.data.auctions,text,references);
 return facts;
}
