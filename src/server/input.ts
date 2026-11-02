import {WORLD_INTENT_TYPES} from './world-intent-types';
import {isCurrentSnapshot,READ_ONLY_SAVE_MESSAGE} from '../shared/snapshot-version';
import {BATTLE_ACTION_FIELDS} from '../shared/battle-action-input';
import {MAX_STORY_PROSE_LENGTH,MAX_STORY_WORKFLOW_BYTES} from '../shared/story-prose';
import {CloudError} from '../cloud/protocol';
import type {GameCommand,GameSnapshot} from '../runtime/contracts';

export const INPUT_LIMITS=Object.freeze({snapshotBytes:64*1024*1024,snapshotNodes:2000000,snapshotDepth:80,commandBytes:128*1024,creationBytes:MAX_STORY_WORKFLOW_BYTES,workflowBytes:MAX_STORY_WORKFLOW_BYTES,modelRequestBytes:MAX_STORY_WORKFLOW_BYTES,queryBytes:MAX_STORY_WORKFLOW_BYTES,depth:32,nodes:200000,string:MAX_STORY_PROSE_LENGTH,array:20000});
type JsonKind='command'|'snapshot'|'query';
function assertJsonTree(input:unknown,kind:JsonKind):void {
  let nodes=0;
  const visit=(value:unknown,depth:number):void=>{
    if(++nodes>(kind==='snapshot'?INPUT_LIMITS.snapshotNodes:INPUT_LIMITS.nodes)||depth>(kind==='snapshot'?INPUT_LIMITS.snapshotDepth:kind==='query'?48:INPUT_LIMITS.depth))throw new CloudError('input-limit','内容超过当前服务可处理的范围，本机进度仍保留，可导出备份',413);
    if(value===null||typeof value==='boolean')return;
    // Existing rules can derive finite capacities above MAX_SAFE_INTEGER. Do not
    // rewrite legal saves; the engine validates game fields after transport checks.
    if(typeof value==='number'){if(!Number.isFinite(value)||(kind==='command'&&Math.abs(value)>Number.MAX_SAFE_INTEGER))throw new CloudError('invalid-input','数值超出允许范围');return;}
    if(typeof value==='string'){if(value.length>INPUT_LIMITS.string)throw new CloudError('input-limit','文字内容过长',413);return;}
    if(typeof value!=='object')throw new CloudError('invalid-input','请求包含不支持的内容');
    if(Array.isArray(value)){if(value.length>INPUT_LIMITS.array)throw new CloudError('input-limit','列表内容过多',413);for(const item of value)visit(item,depth+1);return;}
    if(Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null)throw new CloudError('invalid-input','请求格式无效');
    for(const key of Object.keys(value)){
      if(key==='__proto__'||key==='constructor'||key==='prototype')throw new CloudError('invalid-input','请求字段无效');
      visit((value as Record<string,unknown>)[key],depth+1);
    }
  };
  visit(input,0);
}
export function assertJson(input:unknown,maxBytes=INPUT_LIMITS.commandBytes,kind:JsonKind='command'):void {
  assertJsonTree(input,kind);
  if(Buffer.byteLength(JSON.stringify(input))>maxBytes)throw new CloudError('input-limit','本次内容超过传输上限',413);
}
function assertSnapshotRevision(snapshot:GameSnapshot):void {
  if(!isCurrentSnapshot(snapshot)||!Number.isSafeInteger(snapshot.revision)||snapshot.revision<0)throw new CloudError('invalid-save',READ_ONLY_SAVE_MESSAGE);
  if(Number((snapshot.state as any)?.系统?.revision??0)!==snapshot.revision)throw new CloudError('invalid-save','存档进度编号不一致');
}
export function assertSnapshot(snapshot:GameSnapshot):void {
  assertJson(snapshot,INPUT_LIMITS.snapshotBytes,'snapshot');
  assertSnapshotRevision(snapshot);
}
/** The decompressed bytes are the size boundary. Validate the parsed tree and
 * revision without re-encoding the same multi-megabyte world just to count it. */
export function parseSnapshotBytes(bytes:Buffer):GameSnapshot {
  if(bytes.byteLength>INPUT_LIMITS.snapshotBytes)throw new CloudError('input-limit','本次内容超过传输上限',413);
  const snapshot=JSON.parse(bytes.toString('utf8')) as GameSnapshot;
  assertJsonTree(snapshot,'snapshot');
  assertSnapshotRevision(snapshot);
  return snapshot;
}
// Internal rewards, generated candidates, narrative settlements and arbitrary battle
// creation are deliberately absent. Those are invoked by server-owned workflows.
const fields:Record<string,string[]>={
  'person.apply-rewrite':['grantId','patchId','expectedToken','patch'],
  'party.recover':['personId'],
  'character.quick-action':['characterId','action'],
  'story.begin':['branchId','turn','input','privatePersonId','partyChat'],
  'story.continue-locally':['branchId','turn'],
  'story.close-private':['branchId','turn'],
  'story.close-party':['branchId','turn'],
  'story.resume':['branchId','turn','nextStep'],
  'story.answer':['branchId','turn','requestId','answer'],
  'story.cancel-remaining':['branchId','turn','requestId'],
  'story.resolve-extraction':['branchId','turn','accept'],
  'story.begin-battle-report':['branchId','turn','battleId'],
  'story.fork':['branchId'],
  'opening.situation':['situationId','action'],
  'opening.guidance':['action','giftId'],
  'workflow.apply':['ticket'],
  'research.naming-status':['pendingId','mechanicsHash','phase','reason'],
  'ring.prepare-choice':['presetId','lootId','martialSoulId','requestedEffects','requestedBranches','requestedSkills','requestedEffectIds','exchangeContracts','requirements','resourceCosts','maintenanceCosts','castModes','defaultCastMode','cooldownTurns','usageRules'],
  'player.create':['mode','name','age','gender','origin','appearance','background','opening','situations','avatar','attributes','martialSoulCount','martialSoulDrafts','difficulty','openingWorkshop'],
  'battle.action':[...BATTLE_ACTION_FIELDS],
  'battle.auto-until-player':['limit'],
  'battle.auto-step':['limit'],
  'battle.set-automatic':['enabled'],
  'battle.set-preferences':['scope','preferences'],
  'battle.set-strategy':['focusTargetId','protectTargetId','reservePercent','retreatPercent'],
  'battle.report':['battleId'],
  'world.intent':['fixture','hands','legs','footwear','mouth','contractId','contractKind','versionHash','clauseId','orderId','source','lines','replace','reservePercent','agreementId','terms','realmId','regionId','environment','permissions','nodeId','deviceNodeId','keyItemId','lockId','knowledgeId','method','branchIds','targetItemId','statusId','carrierItemId','claim','decision','covert','accountId','quoteVersion','auctionClass','maximumGold','direction','merchantId','enabled','flags','filters','messageId','text','catalogId','operatorId','releaseAfterMinutes','assetKind','assetRef','materials','type','remainsId','destinationId','modeId','mode','entityId','martialSoulId','itemId','quantity','shopId','templateId','materialId','fingerprint','equipmentSlot','slot','targetId','characterId','recipeId','blueprintId','request','eventId','modifierSkillId','skillId','maintenanceSourceId','defeatId','restraintItemIds','relockAfterMinutes','limits','force','permissionId','facilityId','cellId','locked','amount','targetIds','guardIds','escortId','dutyId','minutes','relationship','relationId','accept','reason','factIds','rescueId','cooperationId','preparationId','deviceOperations','executorId','action','basis','membership','dungeonId','allowTravel','allowCombat','durationMinutes','buyerId','gold','expiresInMinutes','deviceTerms','offerId','reserveGold','auctionId','quoteEventId','forced','level','percent','formId','preset'],
  'world.resolve-battle':[],
  'growth.allocate':['unitId','attribute','steps'],
  'growth.allocate-batch':['sourceKey','allocations'],
  'expedition.start':['dungeonId','difficultyId'],
  'expedition.propose-loot':['characterId','dungeonId','terms'],
  'expedition.propose-loot-resolution':['characterId','allocationId','resourceKind','resourceId','recipientId','quantity','nextPriority'],
  'expedition.respond-loot':['commitmentId','decision'],
  'expedition.collect-loot':['resolutionId'],
  'expedition.collect-returned-loot':['allocationId'],
  'expedition.distribute-loot':['allocationId','materials','items'],
  'companion.prepare-roster':[],
  'companion.hire':['characterId','dungeonId','quoteId'],
  'character.bargain-hire':['characterId','dungeonId','offeredFee'],
  'character.meet':['characterId'],
  'character.assess-speech':['statementId','decision'],
  'character.respond-gift':['commitmentId','decision'],
  'character.respond-custody-trade':['offerId','decision'],
  'character.fulfill-promise':['characterId','commitmentId'],
  'character.attend-invitation':['characterId','commitmentId'],
  'character.respond-npc-request':['requestId','action','itemId'],
  'world.cultivate':['days','hours','minutes'],
  'character.request-growth':['personId','source'],
  'conversation.create':['personIds','title'],'conversation.send':['conversationId','text'],
  'world.escape-captivity':['statusId'],
 'world.wait-until':['day','hour','minute'],
  'world.resume-long-action':['actionId'],'world.abandon-long-action':['actionId'],
  'character.cancel-promise':['characterId','commitmentId'],
  'character.quote-hire':['characterId','dungeonId'],
  'companion.dismiss':['agreementId'],
  'companion.guide-choice':['enabled'],
  'character.end-party':['characterId','membershipId'],
  'expedition.enter':['nodeId','confirmAbandon'],
  'expedition.resolve-battle':[],
  'expedition.harvest':['beastUnitId','options'],
  'expedition.harvest-many':['beastUnitIds'],
  'expedition.open-chest':[], 'expedition.use-camp':[],
  'expedition.condense-ring':['beastUnitId'],
  'expedition.finish-room':['confirmAbandon'], 'expedition.extract':['confirmAbandon'],
  'expedition.withdraw-personally':['agreementId'],
  'supply.buy':['templateId','quantity','maximumGold'], 'inventory.claim-stored':['itemId'],
  'material.sell':['fingerprint','quantity','accountId','quoteVersion'], 'item.sell':['itemId','quantity'],
  'ring.item.prepare':['presetId','itemId','entityId','martialSoulId','ringIndex','slotIndex','requestedEffects','requestedBranches','requestedSkills','requestedEffectIds','exchangeContracts','requirements','resourceCosts','maintenanceCosts','castModes','defaultCastMode','cooldownTurns','usageRules'],
  'ring.reroll':['pendingId','candidateId','candidateIndex'],
  'ring.replace-preset':['pendingId','candidateId'],
  'ring.prepare-from-beast':['presetId','beastUnitId','entityId','martialSoulId','ringIndex','slotIndex','requestedEffects','requestedBranches','requestedSkills','requestedEffectIds','exchangeContracts','requirements','resourceCosts','maintenanceCosts','castModes','defaultCastMode','cooldownTurns','usageRules'],
  'ring.confirm-choice':['pendingId','candidateId'],
  'ring.self-condense':['martialSoulId'],
  'research.begin':['presetId','category','concept','materials','confirmed','expectedMechanicsHash','hostDesign','confirmedDesign'],
  'research.reroll':['pendingId','candidateId','candidateIndex'],
  'research.choose':['pendingId','candidateIndex'],
  'blueprint.craft':['blueprintId','request'],
  'title.confirm':['unitId','mode','title','epithet'],
  'arena.spar':['characterId'], 'arena.endgame':['characterId'],
  'arena.slaughter.begin':[], 'arena.slaughter.bout':[],
  'arena.competition.begin':['venueId','bandId'], 'arena.competition.match':[], 'arena.competition.withdraw':[],
  'arena.reconcile':[],
};
export const PUBLIC_COMMANDS=Object.freeze(Object.keys(fields));
export function validateCommand(command:GameCommand):GameCommand {
  // Large author drafts arrive inside a signed workflow ticket; ordinary game
  // commands keep their existing, smaller allowance and still cannot publish prose.
  assertJson(command,command?.type==='player.create'?INPUT_LIMITS.creationBytes:['workflow.apply','person.apply-rewrite'].includes(command?.type)?INPUT_LIMITS.workflowBytes:INPUT_LIMITS.commandBytes);
  if(!command||typeof command.id!=='string'||!command.id.trim()||command.id.length>180||!Number.isSafeInteger(command.expectedRevision)||command.expectedRevision<0||!Object.hasOwn(fields,command.type))throw new CloudError('invalid-command','不支持这项操作');
  const payload=command.payload;
  if(command.type==='player.create'&&!payload?.background)throw new CloudError('invalid-command','请选择新版背景；旧角色方案仅可查看与导出');
  if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new CloudError('invalid-command','操作参数不完整');
  if(Object.keys(payload).some(key=>!fields[command.type].includes(key)))throw new CloudError('invalid-command','操作包含不支持的参数');
  if(command.type==='world.intent'&&['fixture','hands','legs','footwear','mouth'].some(key=>Object.hasOwn(payload,key))&&payload.type!=='set-realm-arrangement')throw new CloudError('invalid-command','固定与装备选项只能用于画境安排');
  if(command.type==='world.intent'&&!(WORLD_INTENT_TYPES as readonly string[]).includes(String(payload.type)))throw new CloudError('invalid-command','不支持这项世界操作');
  if(command.type==='battle.auto-until-player'&&payload.limit!==undefined&&(!Number.isSafeInteger(payload.limit)||Number(payload.limit)<8||Number(payload.limit)>48))throw new CloudError('input-limit','自动行动次数超出本次上限');
  if(command.type==='battle.set-automatic'&&typeof payload.enabled!=='boolean')throw new CloudError('invalid-command','自动战斗开关必须为布尔值');
  if(command.type==='battle.auto-step'&&payload.limit!==undefined&&(!Number.isSafeInteger(payload.limit)||Number(payload.limit)<1||Number(payload.limit)>8))throw new CloudError('input-limit','自动行动次数超出本次上限');
  if(payload.quantity!==undefined&&(!Number.isSafeInteger(payload.quantity)||Number(payload.quantity)<1||Number(payload.quantity)>999))throw new CloudError('invalid-command','物品数量无效');
  if(command.type==='blueprint.craft'&&payload.request!==undefined){
    const request=payload.request;if(!request||typeof request!=='object'||Array.isArray(request)||Object.keys(request).some(key=>!['quantity','materials','includeMaximum'].includes(key)))throw new CloudError('invalid-command','制作请求包含不支持的参数');
  }
  const quantity=(payload.request as any)?.quantity;
  if(quantity!==undefined&&(!Number.isSafeInteger(quantity)||quantity<1||quantity>999))throw new CloudError('input-limit','每次最多处理999件物品');
  return structuredClone(command);
}
