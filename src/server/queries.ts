import {pendingStoryCustodyTrades,pendingStoryCustodyAuctions} from '../runtime/story-custody-market';
import {localStoryContinuationReason} from '../runtime/story-local-continuation';
import {privateStoryCloseReason} from '../runtime/story-private-close';
import {partyProposalCards} from '../shared/story-party-proposals';
import {previewGeneration} from './character-generation';
import {generationTargets} from '../runtime/generation-completion';
import {partyChatRoster} from '../runtime/story-party-chat';
import {personInteractions} from '../runtime/person-interactions';
import {ringLore} from './reward-presentation';
import {rules} from '../rules';
import type {GameSnapshot} from '../runtime/contracts';
import {concurrentSnapshotQuery} from '../shared/snapshot-query-policy';
import {inspectPaidDesign} from './research-design-advisor';
import {researchDesignCatalogue} from './research-design-workflow';
import {CloudError} from '../cloud/protocol';
import {assertJson,INPUT_LIMITS} from './input';
import type {CalculationSession} from './session';
import {normalizePlayerWorkspace} from '../runtime/player-workspace';
import {GameEngine} from '../runtime/engine';
import {creationQuery} from './creation-queries';
import {presentationQuery} from './presentation-queries';
import {inventoryQuery} from './inventory-queries';
import {sceneQuery} from './scene-queries';
import {playerText} from '../runtime/player-text';
import {inspectRecovery} from '../runtime/journey-recovery';
import {exportCharacterConfig,exportMartialSoulConfig,importCharacterConfig,importMartialSoulConfig} from '../runtime/save-transfer';
import {storyLedger} from '../runtime/story-turns';
import {previewStoryPrompt} from './story-workflows';
import {readStoryPersonHistory,readStoryRelationship} from '../runtime/story-person-history';
import {openingDirections} from '../runtime/opening-directions';
import {scopedPersonWorldWork,validPersonWorkScope} from '../runtime/person-world-work';
import {presetQuery} from './preset-queries';
import {ringExchangeOptions} from './ring-exchange-options';
import {inspectRingDesign,ringDesignCatalogue,adoptOpeningRingDesign,changeOpeningRingYears,ringDesignFailureReason} from './ring-design-advisor';
import {selfCustodyPermissions,captiveSearchOptions} from './custody-action-options';
import {storyResponses} from '../runtime/story-responses';

/** Explicit player-facing queries; there is no arbitrary module/function RPC. */
export type CommittedQueryReader=(name:string,input:Record<string,any>)=>unknown;
/** Owns a private snapshot, not a transaction candidate. No engine access is
 * provided; a future query cannot silently turn this read lane into execution. */
export function createCommittedQueryReader(snapshot:GameSnapshot,seed:string):CommittedQueryReader {
 const seen=new WeakSet<object>(),pending:object[]=[snapshot];
 while(pending.length){const value=pending.pop()!;if(seen.has(value))continue;seen.add(value);for(const child of Object.values(value))if(child&&typeof child==='object')pending.push(child);Object.freeze(value);}
 const view={seed,snapshot:()=>snapshot,get engine():never{throw new CloudError('invalid-query','这项查看不支持独立读取',400);}} as unknown as CalculationSession;
 return (name,input)=>{
  if(!concurrentSnapshotQuery(name,input))throw new CloudError('invalid-query','这项查看不支持独立读取',400);
  return querySession(view,name,input);
 };
}
export function querySession(session:CalculationSession,name:string,input:Record<string,any>):unknown {
  assertJson(input,name==='recovery.inspect'?INPUT_LIMITS.snapshotBytes:INPUT_LIMITS.queryBytes,name==='recovery.inspect'?'snapshot':'query');
  if(name==='creation.ring-design-catalogue')return ringDesignCatalogue(undefined,{kind:'opening',config:input.config,side:input.side,ordinal:input.ordinal});
  if(name==='creation.ring-design-review')return inspectRingDesign(undefined,{kind:'opening',config:input.config,side:input.side,ordinal:input.ordinal},input.proposal);
  if(name==='creation.ring-years'){try{return {pass:true,...changeOpeningRingYears(input.config,input.side,input.ordinal,input.years,input.acquisition)};}catch(error){return {pass:false,reasons:[ringDesignFailureReason(error)]};}}
  if(name==='creation.apply-ring-design')return adoptOpeningRingDesign(input.config,input.side,input.ordinal,input.proposal);
  if(name.startsWith('creation.'))return creationQuery(name,input);
  // Engine queries already own their working state. Fetch a display snapshot only when an error needs translation.
  if(name==='battle.actions')return session.engine.listBattleActions(String(input.actorId??''));
  if(name==='battle.preview'){
    try{return session.engine.previewBattleAction(input);}
    catch(error){return {ready:false,reason:playerText(String((error as Error)?.message??'当前无法执行这项行动'),session.snapshot().state).slice(0,280)};}
  }
  if(name==='world.preview')return session.engine.previewWorldIntent(input);
  if(name==='expedition.risk')return session.engine.previewExpeditionRisk(String(input.dungeonId??''),String(input.difficultyId??''));
  const committedMap=name==='scene.atlas'&&input.scope==='map'&&Object.keys(input).length===1;
  const committedBattle=(name==='scene.battle'||name==='inventory.medicine')&&Object.keys(input).length===0;
  if(committedMap||committedBattle){
    const state=(session.readSnapshot?.()??session.snapshot()).state;
    const project=name==='inventory.medicine'?inventoryQuery:sceneQuery;
    return structuredClone(rules.controls.withReadIndex(state,()=>project(state,name,input)));
  }
  const snapshot=session.snapshot(),state=snapshot.state;
  if(name==='evolution.facts'){const s=state as any,playerId=s.角色.主控单位ID,soul=s.武魂.列表[input.soulId],repair=input.actorId===playerId&&s.成长.列表[playerId]?.扩展?.evolutionLimit?rules.evolutionContent.repairRequest(s):null;return {...rules.evolution.facts(state,input.actorId),sources:rules.evolution.facts(state).sources,manifestations:rules.manifestation.facts(state,input.actorId),canManifest:!!soul&&rules.manifestation.hasTrait(soul),ringOptions:(soul?.魂环ID列表??[]).map((id:string)=>{const ring=s.魂环.列表[id];return {id,ordinal:ring.序号,years:ring.年限,sealed:!!ring.扩展?.evolutionSealed,canRestore:ring.魂技ID列表.every((k:string)=>rules.evolution.compatible(s.技能.列表[k],soul)),names:ring.魂技ID列表.map((k:string)=>s.技能.列表[k].name)};}),self:input.actorId===playerId,locationId:s.人物.列表[playerId].locationId,repair:repair?{name:'修复魂力运转',request:repair,preview:rules.evolution.preview(s,repair)}:null,guides:rules.evolutionContent.GUIDES,contacts:s.世界.scenarioId===rules.evolutionContent.SCENARIO?rules.evolutionContent.CONTACTS:[],sourceCatalogue:rules.evolutionContent.SOURCES.map((m:any)=>({...m,placeNames:m.places.map((id:string)=>s.地图.地点[id]?.name??id),gatherName:s.地图.地点[m.gatherAt]?.name}))};}
  if(name==='evolution.ring-preview'){const s=state as any,soul=s.武魂.列表[input.soulId];if(!soul||!soul.魂环ID列表.includes(input.ringId)||!['seal','restore','keep'].includes(input.mode))throw Error('请选择当前魂环和处理方式');const request={actorId:input.actorId,soulId:soul.id,target:rules.evolution.definition(soul),rings:[{ringId:input.ringId,mode:input.mode}],sources:[]};return {name:input.mode==='seal'?'暂时封存魂技':input.mode==='restore'?'恢复封存魂技':'保留当前魂技',request,preview:rules.evolution.preview(s,request)};}
  if(name==='evolution.progress-preview')return rules.evolution.progressPreview(state,input);
  if(name==='evolution.guide-preview'){const s=state as any,soul=s.武魂.列表[input.soulId],step=rules.evolutionContent.guideStep(soul,input.guideId,input.ordinal??Math.max(3,soul.魂环ID列表.length+1)),request={actorId:input.actorId,soulId:soul.id,target:step.target,artId:step.artId,sources:input.sources??[]};return {name:step.name,request,preview:rules.evolution.preview(s,request),ringSuggestion:step};}
    if(name==='evolution.preview')return rules.evolution.preview(state,input);
  if(name==='ring.design-catalogue')return ringDesignCatalogue(state,input.target);
  if(name==='ring.design-review')return inspectRingDesign(state,input.target,input.proposal);
  if(name.startsWith('preset.'))return rules.controls.withReadIndex(state,()=>presetQuery(state,name,input));
  if(name.startsWith('presentation.'))return rules.controls.withReadIndex(state,()=>presentationQuery(state,name,input));
  if(name.startsWith('inventory.'))return rules.controls.withReadIndex(state,()=>inventoryQuery(state,name,input));
  if(name.startsWith('scene.'))return rules.controls.withReadIndex(state,()=>sceneQuery(state,name,input));
  switch(name){
    case 'story.responses':{
      if(Object.keys(input).some(key=>key!=='revision')||input.revision!==snapshot.revision)throw new CloudError('stale-workflow','故事进度已变化，请重新查看',409);
      return rules.controls.withReadIndex(state,()=>storyResponses(snapshot));
    }
    case 'person.rewrite-pending':return rules.personRewrite.pending(state,(state as any).角色.主控单位ID);
    case 'person.rewrite-preview':return rules.personRewrite.preview(state,String(input.grantId??''),(state as any).角色.主控单位ID);
    case 'custody.self-permissions':{if(Object.keys(input).length)throw Error('本人配合只读取当前场景');return selfCustodyPermissions(state);}
    case 'custody.search-options':return captiveSearchOptions(state,input);
    case 'world.people-work':{
      if(Object.keys(input).some(k=>!['revision','scope'].includes(k))||!validPersonWorkScope(input.scope)||input.revision!==snapshot.revision)throw new CloudError('stale-workflow','旅程已变化，人物原待办保留',409);
      return {pending:scopedPersonWorldWork(state,input.scope).length>0};
    }
    case 'generation.preview':return previewGeneration(snapshot,String(input.type??''),input.payload??{});
    case 'generation.audit':{
      const current:any=state,targets=generationTargets(current,current,Object.keys(current.人物?.列表??{}));
      return Object.values(current.人物?.列表??{}).flatMap((person:any)=>{
        const missing=targets.filter(t=>t.id===person.id&&t.kind==='person'||t.ownerId===person.id);
        return missing.length?[{id:person.id,name:person.name,occupation:person.occupation,profile:missing.some(t=>t.kind==='person'),personalName:missing.some(t=>t.allowPersonalName),abilities:missing.filter(t=>t.kind!=='person').map(t=>({id:t.id,name:t.value.名称??t.value.name??t.value.soulName,fingerprint:t.fingerprint})),mechanicsChanged:false}]:[];
      });
    }
    case 'generation.service-rebuild-audit':return Object.values((state as any).人物?.列表??{}).flatMap((person:any)=>{
      const archetype=rules.world.NPC_ARCHETYPES[person.扩展?.archetypeId];
      if(!archetype?.full||!archetype.escort||person.扩展?.角色库ID)return [];
      const current:any=state,souls=Object.values(current.武魂.列表).filter((s:any)=>s.持有者单位ID===person.id);
      return [{id:person.id,name:person.name,occupation:person.occupation,souls:souls.map((s:any)=>s.名称),level:current.成长.列表[person.id]?.魂力等级,budget:rules.world.npcCreationBudget(person.扩展.archetypeId),mechanicsChanged:true}];
    });
    case 'story.turn':return structuredClone(storyLedger(state));
    case 'story.private-close-preview':case 'story.local-continuation-preview':{
      const ledger=storyLedger(state);
      if(Object.keys(input).some(key=>!['revision','branchId','turn'].includes(key))||input.revision!==snapshot.revision||input.branchId!==ledger.branchId||input.turn!==ledger.active?.number)throw new CloudError('stale-workflow','这段故事已变化，请重新查看当前安排。',409);
      const reason=name==='story.private-close-preview'?privateStoryCloseReason(snapshot.state):localStoryContinuationReason(snapshot.state);
      return {available:reason===null,reason,revision:snapshot.revision,branchId:ledger.branchId,turn:ledger.active?.number};
    }
    case 'character.history':return readStoryPersonHistory(state,input);
    case 'character.relationship':return readStoryRelationship(state,input);
    case 'character.interactions':return personInteractions(state,input);
    case 'story.loot-templates':return Object.fromEntries(rules.expedition.loot.templates().map((t:any)=>[t.id,t.name]));
    case 'expedition.allocations':return rules.expedition.loot.view(state,input.before??-1);
    case 'expedition.personal-withdrawal':return rules.expedition.personalWithdrawal(state);
    case 'story.party-chat':return partyChatRoster(state);
    case 'story.party-proposals':return partyProposalCards(state).map(c=>({...c,itemNames:Object.fromEntries([...Object.keys(c.terms.itemOwners??{}),...(c.terms.itemTargets??[]).map((t:any)=>t.templateId),...(c.terms.nextPriority?[c.terms.nextPriority.templateId]:[])].map(id=>[id,rules.world.ITEM_TEMPLATES[id]?.name??'指定物品']))}));
    case 'story.custody-market-work':{const s=snapshot;if(input.revision!==s.revision)throw Error('交易情况已变化，请重新查看');return {trades:pendingStoryCustodyTrades(s.state).map(r=>({offerId:r.id,buyerId:r.buyerId})),auctions:pendingStoryCustodyAuctions(s.state)};}
    case 'story.prompt-preview':return previewStoryPrompt(snapshot,input,session.seed);
    case 'opening.situations':return rules.world.openingSituationFacts(state);
    case 'opening.directions':return openingDirections(state);
    case 'opening.guidance':return {...rules.world.openingGuidance(state),freeGuide:rules.expedition.companionRoster(state,rules.expedition.DUNGEON_ID).freeGuide};
    case 'workspace.validate':return normalizePlayerWorkspace(input.workspace,state);
    case 'world.blank':return new GameEngine('empty-world').getSnapshot();
    case 'recovery.inspect':return inspectRecovery(state,input.snapshot);
    case 'expedition.entry':{
      const dungeon=rules.expedition.DUNGEON_PROFILES[String(input.dungeonId||rules.expedition.DUNGEON_ID)];
      if(!dungeon)throw new CloudError('invalid-query','副本不存在');
      return {id:dungeon.id,locationId:dungeon.locationId};
    }
    case 'battle.action-index':{
      const actorId=(state as any).角色.主控单位ID;
      if(Object.keys(input).some(k=>k!=='actorId')||input.actorId!==undefined&&input.actorId!==actorId)throw new CloudError('invalid-query','只能查看自己的战斗行动');
      return rules.combat.listActionIndexPrepared(state,actorId);
    }
    case 'companion.roster':return rules.expedition.companionRoster(state,input.dungeonId);
    case 'ring.item':return {...rules.cycle.previewRingItem(state,input),lore:ringLore((state as any).物品.实例[input.itemId],rules.cycle.previewRingItem(state,input).source),facts:rules.cycle.ringItemFacts((state as any).物品.实例[input.itemId])};
    case 'ring.exchange-options':return ringExchangeOptions(state,input);
    case 'ring.beast':{const quote=rules.expedition.previewRingChoice(state,input);const profile=(Object.values((state as any).魂兽档案.列表) as any[]).find(p=>p.单位ID===quote.beastUnitId);return {...quote,lore:profile?ringLore(null,profile):null};}
    case 'ring.choices':{const own=rules.cycle.pendingRingSkillChoice(state,String(input.pendingId??''));if(!own)throw Error('没有本人可查看的魂技候选');const pending=rules.cycle.ringSkillChoicePresentation(state,own.id);pending.candidates=pending.candidates.map((candidate:any)=>{const skills=candidate.skills.map((skill:any)=>({...skill,description:globalThis.SoulSkillProse.description({...skill,sourceMartialSoulId:pending.martialSoulId},state)}));return {...candidate,skills,description:skills.map((skill:any)=>skill.description).join('\n')};});const item=(state as any).物品.实例[pending?.sourceSettlement?.itemIds?.[0]];return {...pending,lore:ringLore(item,(state as any).魂兽档案.列表[pending.beastProfileId]),canReroll:rules.talents.has(state,'reroll',pending.playerId)};}
    case 'ring.explain':{const own=rules.cycle.pendingRingSkillChoice(state,String(input.pendingId??''));if(!own)throw Error('没有本人可查看的魂技候选');return rules.cycle.explainRingSkillChoices(state,own.id);}
    case 'research.explain':return rules.expedition.explainResearchChoices(state,String(input.pendingId??''));
    case 'research.design-catalogue':return researchDesignCatalogue(state,input);
    case 'research.design-review':return inspectPaidDesign(state,input);
    case 'research.host-catalog':{
      if(Object.keys(input).length)throw Error('宿主设计目录不接受额外参数');
      const catalog=rules.openingWorkshop.catalog();
      return {effects:Object.fromEntries(Object.entries(catalog.effects).filter(([id])=>!id.startsWith('intimate.'))),forms:catalog.forms,restraints:catalog.restraints,abilityKinds:rules.controls.ABILITY_KINDS};
    }
    case 'research.preview':{
      const access=rules.expedition.previewWorkshopAccess(state);
      try{return {...rules.expedition.previewResearch(state,input),serviceReason:access.reason};}
      catch(error){return {pass:false,serviceReason:access.reason,reason:String((error as Error).message)};}
    }
    case 'research.recommend':return rules.expedition.recommendResearchMaterials(state,{category:input.category,concept:input.concept,presetId:input.presetId,goal:input.goal,...(input.hostDesign?{hostDesign:input.hostDesign}:{}),...(input.confirmedDesign?{confirmedDesign:input.confirmedDesign}:{})});
    case 'research.choices':{
      const pending=(state as any).研发?.待处理?.[String(input.pendingId??'')];
      if(!pending)return null;
      rules.expedition.assertResearchOwner(state,pending,(state as any).角色.主控单位ID);
      return {pending,access:rules.expedition.previewWorkshopAccess(state),canReroll:rules.talents.has(state,'reroll'),
        options:(pending.candidates??[]).filter((entry:any)=>entry.pass).map((entry:any)=>({index:entry.index,grade:rules.world.itemGradeFromValue(rules.expedition.compileProductValue(pending.category,entry.normalized)),rerollReason:pending.category==='魂导器'?rules.expedition.researchRerollAvailability(state,pending,entry.index).reason:''}))};
    }
    case 'research.access':return rules.expedition.previewWorkshopAccess(state);
    case 'config.export-character':return exportCharacterConfig(input.draft);
    case 'config.export-soul':return exportMartialSoulConfig(input.soul);
    case 'config.import-character':return importCharacterConfig(input.serialized);
    case 'config.import-soul':return importMartialSoulConfig(input.serialized);
    default:throw new CloudError('invalid-query','不支持这项查看操作');
  }
}
