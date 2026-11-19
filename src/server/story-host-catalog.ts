import {createHash} from 'node:crypto';
import {storyActionCatalog,sharedActionReferenceRules} from '../shared/story-action-prompt';
import {storyHostResponseSchema} from './story-host-response-schema';
import type {ModelJsonSchema} from '../shared/model-json-schema';
import {StoryPlanValidationError} from '../runtime/story-plan-validation-error';
import {freeActionEffectSchema} from '../runtime/story-free-actions';
import type {StoryPlan} from '../runtime/story-turns';

const words=(s:string)=>s.split(' ').filter(Boolean);
const definitions=[
 ['query','资料查询','查看已有资料、人物和历史','inspect-commerce city-history check-history person-history resolve-person inspect-person inspect-inventory inspect-growth inspect-opening'],
 ['social','交流关系','交谈、联络、约定与人物回应','contact-person ask-release consider-person-goal answer-person-plan meet quote-hire bargain-hire accept-hire-offer label-person tell-party tell-person address-person promise-gold fulfill-promise cancel-promise promise-item give-item give-gold invite attend-invitation respond-npc-request invite-date exchange-contact propose-relationship respond-person-relation end-relationship'],
 ['daily','移动日常','旅行、等待、修炼、恢复与日常安排','travel recover recover-party escape-captivity cultivate wait-until resume-long-action abandon-long-action wait-until-date opening-situation opening-guidance'],
 ['battle','战斗探险','战斗行动、赛事、远征与采集','register-competition competition-match competition-withdraw battle-strategy battle-action enter-room extract-expedition use-camp open-chest harvest-beast harvest-beasts battle-report start-expedition spar person-duel capture-person spare-person execute-person'],
 ['items','物品装备','购买补给、装备、使用、存取和药剂施用','intimate-craft intimate-equip intimate-detach host.set-suppression host.set-form host.set-appearance device.lock device.unlock device.suppress-lock device.break-rule device.analyze-lock device.create-key device.arcane-lock buy sell equip unequip use-item store-item retrieve-item loot-item loot-coins use-prebattle-pill supply-buy prepare-poisoned-serving offer-disguised-drug respond-disguised-drug consume-food-drink coat-item apply-contact-drug direct-spray release-toxic-cloud touch-coated-item'],
 ['trade','交易拍卖','材料买卖、寄售、竞拍与经营','trade-commerce-material start-curated-auction start-asset-auction bid-asset-auction register-auction-proxy cancel-auction-proxy take-auction-proxy take-asset-auction-host cancel-asset-auction relist-asset-auction collect-auction-item ship-shop-auction set-commerce-subscription read-commerce-message reply-commerce-message quote-material-sale sell-material quote-item-sale sell-item propose-custody-transfer respond-custody-transfer cancel-custody-transfer start-custody-auction bid-custody-auction pass-custody-auction cancel-custody-auction'],
 ['craft','研发制作','配方研发、制造、材料与候选选择','learn-preset-blueprint inspect-workshop recommend-research preview-research begin-research inspect-research choose-research preview-craft craft-blueprint create-support-consumable'],
 ['growth','武魂成长','武魂切换、魂环与成长分配','inspect-evolution preview-evolution adopt-evolution continue-evolution cancel-evolution acquire-evolution-source brew-evolution-item manifest-soul switch-soul retract-martial-soul inspect-ring prepare-ring inspect-ring-item prepare-ring-item inspect-ring-choices choose-ring allocate-growth'],
 ['contracts','人物契约','完整版本协商、真实灵魂誓约及有来源的有限履约','propose-person-contract respond-person-contract retry-person-contract end-person-contract declare-person-contract-breach issue-person-contract-order decline-person-contract-order form-controlled-contract withdraw-control-source'],
 ['control','能力施用与控制','本人已有魂技、魂导器、魂骨等场外能力，以及外貌伪装、识破、主动解除、器具调节、挣脱与维持','restrain-desire break-restraint search-captive release-captive set-restraint-mode detach-restraint attach-restraint permit-restraint request-restraint-permission respond-restraint-permission-request revoke-restraint-permission issue-field-control use-field-ability request-ability-use respond-ability-use stop-maintenance dismiss-disguise inspect-disguise disclose-identity'],
 ['custody','画境与人物安排','自愿邀请入住、换房与离开画境、画境换景、人物装备和许可，以及已有器具操作','invite-realm-guest move-realm-guest end-realm-visit set-realm-arrangement reshape-realm arrange-realm-resident set-resident-permissions reward-resident punish-resident deploy-resident recall-resident discuss-resident-tactics permit-seal revoke-seal-permission seal-person awaken-seal open-seal strike-seal-device seize-seal-device transfer-seal-control await-seal-release observe-custody-person tell-custody-news send-custody-letter acquire-custody-facility visit-custody-cell set-custody-cell-door break-custody-cell-door repair-custody-facility place-captive admit-captive withdraw-captive permit-custody-duty assign-custody-guard end-custody-duty start-custody-escort pause-custody-escort resume-custody-escort cancel-custody-escort captive-daily'],
 ['party','队伍合作','自愿临时或长期邀请入队、雇佣、战利品分配与合作准备','request-person-growth propose-performance-agreement respond-performance-agreement end-performance-agreement hire dismiss prepare-cooperation-battle recover-cooperation-restraints close-cooperation-preparation propose-person-cooperation respond-person-cooperation impose-person-cooperation end-person-cooperation resume-person-cooperation propose-loot-resolution collect-loot propose-loot invite-party end-party choose-guide'],
 ['objects','人物与叙事对象','登记人物、观察表达、检定与叙事对象','remember-object resolve-object instantiate-item world-event describe clarify attribute-check free-action opposed-check introduce-person'],
] as const;
const groupByAction=new Map(definitions.flatMap(([id,,,kinds])=>words(kinds).map(kind=>[kind,id] as const)));
const common=new Set(words('inspect-inventory inspect-person inspect-growth inspect-opening inspect-commerce resolve-person contact-person quote-hire invite-party describe clarify travel wait-until wait-until-date buy supply-buy equip unequip use-item stop-maintenance'));
const fields:Record<string,string[]>={
 query:['commerce','growth','openingSituations','openingGuidance','recentChecks','cityStages'],
 social:['availableCharacters','releaseResponses','npcRequests','npcGoals','autonomousPlans','partyChatRecipients','personalKnowledge','personalContacts','partyConversation'],
 daily:['knownLocations','longActions','cultivation','openingSituations','openingGuidance','huntingDestinations','currentFacility','parentServices'],
 battle:['knownLocations','availableCharacters','sparringPartners','battle','expedition','competition','recentBattles','huntingDestinations','fieldResources'],
 items:['deviceOperations','commerce','inventory','materials','poisons','fieldResources','currentFacility','parentServices'],trade:['commerce','materials','custody'],
 craft:['workshop','materials','commerce','fieldResources','personCreationPresetSouls'],growth:['evolution','rings','growth','cultivation'],
 contracts:['personContracts','abilityUseRequests','fieldResources','commerce'],
 control:['residentContext','custody','captivity','abilityUseRequests','fieldResources','poisons'],
 custody:['residentContext','custody','captivity','releaseResponses','npcRequests','longActions','currentFacility','parentServices'],
 party:['residentContext','custody','availableCharacters','party','huntingDestinations','pendingCompanions','npcCollaborations','lootTemplates','lootPriorities','lootAgreements','lootRoster','pendingLoot','recentLootAllocations','lootResolutions'],
 objects:['availableCharacters','personCreationOptions','personCreationPresetSouls','personCreationProfileFields','personCreationAttributeBudget','personCreationFieldSources','narrativeObjects','freeActions','attributeChecks','cityStages'],
};
const pick=(value:any,keys:readonly string[])=>Object.fromEntries(keys.filter(key=>value&&Object.hasOwn(value,key)).map(key=>[key,value[key]]));
const compactPerson=(person:any,self=false)=>person?{
 ...pick(person,['id','name','canonicalId','age','gender','identity','occupation','level','rank','gold','lifeStatus','resources','scope','encounter','relationship','relationshipScore','communication','commitments','abilitySoulId','escortService','hireAvailability','lastHireInquiry','lastHireOffer','characterization','speechStyle','backgroundContext','recentSharedEvents']),
 ...(person.actionState?{actionState:{...pick(person.actionState,['observedAt','lifeStatus','influence','constraints','worldActions',...(self?['abilityConditions','abilityConditionsIndex','battle','tacticalActions']:[])]),statuses:(person.actionState.statuses??[]).map((s:any)=>pick(s,['instanceId','effectId','name','layers','strength','remainingMinutes','remainingRounds','state']))}}:{}),
 abilities:(person.abilities??[]).map((a:any)=>pick(a,self?['id','name','source','selfConditions']:['id','name'])),
 martialSouls:(person.martialSouls??[]).map((s:any)=>pick(s,['id','name','active','sealed'])),
 ...(person.sharedBattleEncounters?.length?{sharedBattleEncounters:person.sharedBattleEncounters}:{}),
}:person;
export interface HostCatalogProgress {version:string;groups:string[]}
export interface HostCatalogAccess {version:string;read(groups:unknown):Record<string,any>;validate(groups:unknown):string[];responseSchema?(groups?:string[]):ModelJsonSchema;groupsForActions?(kinds:string[]):string[];validatePlan?(plan:StoryPlan,fromStep?:number):void}

function historicalSourcePointers(extra:Record<string,any>){
 const supplied=[...(extra.recentNarrative??[]).filter((entry:any)=>typeof entry.content==='string').map((entry:any)=>({turn:entry.turn,field:entry.field})),
  ...(extra.recalledNarrative??[]).flatMap((entry:any)=>(entry.passages??[]).filter((passage:any)=>typeof passage.text==='string').map((passage:any)=>({turn:entry.source?.turn,field:passage.field})))];
 return [...new Map(supplied.filter(source=>Number.isSafeInteger(source.turn)&&source.turn>0&&['input','prose'].includes(source.field)).map(source=>[`${source.turn}:${source.field}`,source])).values()];
}

/** One frozen audience-filtered source; lookup never queries or executes the game. */
export function createHostCatalog(actions:any[],facts:Record<string,any>,extra:Record<string,any>,bounded=false,sourceText=''){
 const historicalSources=historicalSourcePointers(extra);
 const currentHireOffers=(facts.people??[]).flatMap((person:any)=>{
  const offer=person.lastHireOffer;
  return offer?.status==='offered'&&offer.id===person.hireAvailability?.currentOfferId&&offer.playerId===facts.player?.id&&offer.personId===person.id
   ?[{quoteId:offer.id,personId:person.id,characterId:offer.characterId,canonicalId:person.canonicalId,dungeonId:offer.dungeonId,fee:offer.fee}]:[];
 });
 const currentEffects=[...(facts.freeActions?.current??[]),...(facts.people??[]).flatMap((person:any)=>person.freeActions?.current??[])];
 // Only offer source pointers and update IDs actually present in this audience's
 // supplied material. These are existing permissions, not new world facts.
 actions=actions.map(action=>{
  if(action.parameters.includes('dungeonId')&&Array.isArray(facts.huntingDestinations))action={...action,valueOptions:{...action.valueOptions,dungeonId:facts.huntingDestinations.map((d:any)=>d.id)},parameterMeanings:{...action.parameterMeanings,dungeonId:'从facts.huntingDestinations选择远征id；locationId是地图地点，不能作为远征id'}};
  if(action.kind==='accept-hire-offer')return {...action,...(currentHireOffers.length?{valueOptions:{...action.valueOptions,quoteId:currentHireOffers.map((offer:any)=>offer.quoteId)}}:{}),referenceParameters:{...action.referenceParameters,quoteId:{from:'facts.people[].lastHireOffer',valueField:'id',currentIdField:'hireAvailability.currentOfferId',matchFields:['personId','dungeonId'],requiredStatus:'offered',meaning:'接受同一人物、目的地的当前正式报价；金额由原报价读取，不从正文提取或重填'}}};
  if(action.kind==='invite-realm-guest')return {...action,optionSources:{...action.optionSources,realmId:'realmVisitOptions.realms[].id',regionId:'realmVisitOptions.realms[].rooms[].id',characterId:'realmVisitOptions.realms[].invitees[].characterId'}};
  if(action.kind==='free-action')return {...action,arrayParameters:Object.fromEntries(['onSuccess','onFailure'].map(branch=>[branch,{...action.arrayParameters[branch],items:freeActionEffectSchema(currentEffects)}]))};
  if(action.kind!=='remember-object')return action;
  const hasHistory=historicalSources.length>0,objectIds=(facts.narrativeObjects??[]).map((object:any)=>object.id);
  const removed=new Set([...(!hasHistory?['from']:[]),...(!objectIds.length?['objectId']:[])]),details=structuredClone(action.objectParameters.details);
  if(!historicalSources.some(source=>source.field==='prose'))details.items.properties.basis.enum=['reported'];
  const from={anyOf:historicalSources.map(source=>({type:'object',properties:{turn:{type:'integer',enum:[source.turn]},field:{type:'string',enum:[source.field]}},required:['turn','field'],additionalProperties:false}))};
  return {...action,parameters:action.parameters.filter((name:string)=>!removed.has(name)),optionalParameters:action.optionalParameters.filter((name:string)=>!removed.has(name)),objectParameters:{details,...(hasHistory?{from}:{})},arrayParameters:{...action.arrayParameters,aliases:{...action.arrayParameters.aliases,items:{type:'string',minLength:1,maxLength:40,description:'原文中逐字出现的其他称呼；没有其他称呼时省略'}}},valueOptions:{...action.valueOptions,...(objectIds.length?{objectId:objectIds}:{})}};
 });
 for(const action of actions)if(!groupByAction.has(action.kind))throw Error(`行动尚未登记分类：${action.kind}`);
 const groups=definitions.flatMap(([id,name,purpose])=>{
  const entries=actions.filter(a=>groupByAction.get(a.kind)===id);
  return entries.length?[{id,name,purpose}]:[];
 });
 const version=createHash('sha256').update(JSON.stringify([4,actions])).digest('hex');
 const validate=(input:unknown):string[]=>{
  if(!Array.isArray(input)||!input.length||input.length>groups.length||input.some(id=>typeof id!=='string'||!groups.some(g=>g.id===id))||new Set(input).size!==input.length)throw new StoryPlanValidationError('请选择本次目录中的有效分类。',{instancePath:'/catalogGroups',keyword:'catalog-selection',submitted:input??null,reference:{instancePath:'/catalogDirectory',value:{ids:groups.map(group=>group.id),minItems:1,uniqueItems:true}}});
  return [...input];
 };
 const detailed=(selected:any[])=>{
  // Values already supplied by dynamic facts have a single owner.
  const rows=selected.map(action=>{
   if(action.kind==='register-competition'&&facts.competition?.venues){const {venueId,...rest}=action.valueOptions??{};return {...action,valueOptions:rest,optionSources:{venueId:'facts.competition.venues'}};}
   if(action.kind==='create-support-consumable'&&extra.supportManufacturing?.recipes){const {recipeId,...rest}=action.valueOptions??{};return {...action,valueOptions:rest,optionSources:{recipeId:'supportManufacturing.recipes'}};}
   return action;
  });
  return {actionCatalog:storyActionCatalog(rows),actionReferenceRules:sharedActionReferenceRules(rows),actionIntegerParameters:[...new Set(rows.flatMap(a=>a.integerParameters??[]))]};
 };
 const realmArrangement='画境安排复用custody分类的residentContext。九美图有region-1至region-9和common公共区；多人可同房，人物席位不随房间改变。换主题用reshape-realm及environment.themeId，description可省略沿主题默认；只改变场景，不改变人物情绪数值。固定与装备使用set-realm-arrangement登记选项，其他字段省略时保持原状；实际发声、行动依全部有效限制。请求真身出画而当前设施固定时，可在同一已授权安排中先解除本人画境固定再调遣，不能绕过他源约束、费用或人数。已退休营救阶段不可调用；营救是正常前往和战斗后释放结果，不再要求撤离确认。';
 const read=(requested:unknown)=>{
  const ids=validate(requested),selected=actions.filter(a=>ids.includes(groupByAction.get(a.kind)!));
  const keys=new Set(ids.flatMap(id=>fields[id]??[]));
  return {catalogVersion:version,catalogGroups:ids,...detailed(selected),...(ids.includes('custody')?{realmArrangement,...pick(extra,['realmVisitOptions'])}:{}),facts:{...pick(facts,[...keys]),player:compactPerson(facts.player,true),people:(facts.people??[]).map((p:any)=>compactPerson(p)),knownPeople:facts.knownPeople,personReferences:facts.personReferences,narrativeObjects:facts.narrativeObjects},...(ids.some(id=>['craft','growth','objects'].includes(id))?pick(extra,['presetOptions']):{}),...(ids.some(id=>['daily','battle'].includes(id))?pick(extra,['travelOptions']):{}),...(ids.includes('craft')?pick(extra,['supportManufacturing']):{}),...(ids.includes('control')?pick(extra,['maintenanceOptions','privateActionResources','fieldAbilitySources','disguiseSources']):{}),...(ids.includes('contracts')?pick(extra,['contractSources']):{})};
 };
 const travelRequested=/前往|赶往|出发|动身|赶路|路线|启程|旅行|去往|移动到|回到/.test(sourceText);
 const huntRequested=/猎魂|猎杀|魂兽|副本|雇佣|向导/.test(sourceText);
 const storageRequested=/寄存|暂存|存放|存入|取出|取回|取走|领回|拿回|仓库|储物/.test(sourceText)||
   (actions.length>0&&actions.every(a=>['store-item','retrieve-item','inspect-inventory'].includes(a.kind)));
 const itemRequested=storageRequested||/行囊|背包|装备|购买|出售|用药|服用|物品/.test(sourceText);
 const initialFacts=bounded?facts:{
  ...pick(facts,['location','time','calendar','communication','captivity','abilityUseRequests','releaseResponses','npcRequests','openingSituations','openingGuidance','personReferences','attributeChecks','party','pendingCompanions','currentFacility','parentServices',...(travelRequested?['knownLocations']:[]),...(huntRequested?['huntingDestinations']:[])]),
  player:compactPerson(facts.player,true),people:(facts.people??[]).map((p:any)=>compactPerson(p)),
  knownPeople:(facts.knownPeople??[]).map((p:any)=>pick(p,['id','name','encounter','communication','playerLabels'])),
  ...(itemRequested?{inventory:storageRequested?facts.inventory??[]:(facts.inventory??[]).map((i:any)=>pick(i,['id','name','quantity','type','carried','storage','templateId']))}:{}),
  narrativeObjects:facts.narrativeObjects,
  ...(facts.commerce?{commerce:{service:facts.commerce.service,materialOffers:facts.commerce.materialOffers,supplies:(facts.commerce.supplies??[]).map((i:any)=>pick(i,['templateId','name','unitGold'])),shops:(facts.commerce.shops??[]).map((shop:any)=>({...pick(shop,['shopId','name']),items:(shop.items??[]).map((i:any)=>pick(i,['itemId','name','quantity']))}))}}:{}),
 };
 const detailedItems=new Set(['buy','supply-buy','equip','unequip','use-item']);
 const hasRealmVisitChoices=Boolean(extra.realmVisitOptions?.realms?.length);
 const first=bounded?actions:actions.filter(a=>a.kind==='invite-realm-guest'&&hasRealmVisitChoices||common.has(a.kind)&&(!detailedItems.has(a.kind)||itemRequested)&&(a.kind!=='quote-hire'||huntRequested||currentHireOffers.length>0)||a.kind==='accept-hire-offer'&&currentHireOffers.length>0);
 const initial={catalogVersion:version,catalogDirectory:groups,...detailed(first),facts:initialFacts,...(hasRealmVisitChoices?pick(extra,['realmVisitOptions']):{}),
  ...pick(extra,['conversation','participantDialogue','recentNarrative','hostPrivateRecall','hostPrivateMemories','narrativeSummaries','recalledNarrative','travelOptions','actionOutcomes']),
  ...pick(extra,['privateActionResources','maintenanceOptions']),
  catalogProtocol:{...(bounded?{realmArrangement}:{} ),request:{catalogGroups:['分类ID，可一次请求多个']},lookup:'缺少接口参数或实际来源选项时，直接按request返回catalogGroups读取对应分类，不用clarify向玩家询问接口参数或申请查目录。契约、誓言与违约处罚的本人真实来源选择在contracts分类的contractSources。已有魂技、魂导器、魂骨等能力的施用在control分类；fieldAbilitySources提供本人真实skillId、branchIds与modeId。用use-field-ability实际施放；对自己施放无需请求他人许可，不能因为初始目录未展开就声称无能力接口或要求玩家解释接口。',contractSource:'灵魂契约使用contractSources中的实际skillId、branchId及所选处罚selection.nodeId和params，不省略多处罚来源的选择。提出契约本身就是正式提案，不夹带action等未登记字段，也不替对方同意。',source:{default:{input:true},wholeInput:{input:true},literal:'仅需限定来源范围或区分重复原文时，选择原输入中的逐字连续子句；所有source仍须覆盖全部输入。原文不可拼改，交流只送达deliverySource所选原话。'},maximumLookups:1,continuation:'查询结果决定后续选择时可在查询segment登记refreshAfter:true；只补充一次剩余计划。clarify直接向玩家提问；已执行步骤不重复。',afterLookup:'返回完整channel/segments行动计划；不再请求目录',directPlan:'能填写合法计划就直接返回；无需查目录；task由代码从kind推导',references:'已知人物使用characterId。characterStep只引用本轮更早查询或创建步骤的结果编号，不是people数组下标，不能引用自己或未来步骤。目录索引不授予物品、资源、距离、权限；查目录不执行行动'},
 };
 const responseSchema=(requested?:string[])=>{const selected=requested?validate(requested):undefined;return storyHostResponseSchema(selected?actions.filter(a=>first.includes(a)||selected.includes(groupByAction.get(a.kind)!)):first,groups.map(g=>g.id),selected===undefined);};
 const groupsForActions=(kinds:string[])=>[...new Set(actions.filter(action=>kinds.includes(action.kind)&&!first.includes(action)).map(action=>groupByAction.get(action.kind)!))];
 const validatePlan=(plan:StoryPlan,fromStep=0)=>{
  for(const [index,{action}] of plan.segments.entries()){
   if(index<fromStep||action.kind!=='accept-hire-offer'||action.quoteStep!==undefined)continue;
   const offer=currentHireOffers.find((offer:any)=>offer.quoteId===action.quoteId),matchesPerson=offer&&[offer.personId,offer.characterId,offer.canonicalId].includes(action.characterId);
   const parameter=!offer?'quoteId':action.characterId!==undefined&&!matchesPerson?'characterId':action.dungeonId!==offer.dungeonId?'dungeonId':null;
   if(parameter)throw new StoryPlanValidationError('接受雇佣须引用同一人物和目的地仍有效的正式报价；不能从对话金额生成或替换报价',{
    instancePath:`/segments/${index}/action/${parameter}`,keyword:'hire-offer-reference',submitted:action[parameter]??null,
    reference:{instancePath:'/facts/people',value:{offers:currentHireOffers,quoteSource:'lastHireOffer.id',currentSource:'hireAvailability.currentOfferId'}},
   });
  }
 };
 return {initial,access:{version,read,validate,responseSchema,groupsForActions,validatePlan} satisfies HostCatalogAccess};
}
