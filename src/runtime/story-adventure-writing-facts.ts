import {compileOwnedAbilities} from './story-person-writing-facts';
import {rules} from '../rules';
import {authoredDescription} from './player-copy';
import {compileHirePayment} from './story-history-writing-facts';
const copy=<T>(v:T):T=>structuredClone(v);
const pick=(v:any,keys:string[])=>Object.fromEntries(keys.filter(k=>v&&Object.hasOwn(v,k)).map(k=>[k,copy(v[k])]));
/** Existing party arrangements, independent of the current action or a person's contract. */
export function compilePartyContext(p:any){
 const party=copy(p),guide=party.guide;
 if(guide){
  const stages:Record<string,string>={unused:guide.enabled===false?'免费护航偏好已暂停，尚未出发':'免费护航偏好已启用，尚未出发',active:'免费向导已随本次远征出发',consumed:'首次免费护航已经使用'};
  if(!stages[guide.status])throw Error(`队伍护航状态缺少编译：${guide.status}`);
  guide.stage=stages[guide.status];
 }
 return party;
}
function known(v:any,fields:string[],label:string){const unknown=Object.keys(v).filter(k=>!['type','id','transactionType','summary','meaning',...fields].includes(k));if(unknown.length)throw Error(`冒险结果缺少字段编译：${label}/${unknown.join(',')}`);}
const extractionFields=['expeditionId','leaderId','participantIds','dungeonId','dungeonName','entranceLocationId','difficultyId','result','reason','completedNodeIds','materialValue','movedItemIds','stashedItemIds','companions','allocationId','allocation','materialStackCount','abandoned'];
export const ADVENTURE_RECEIPT_FIELDS:Record<string,string[]>={
 'cooperation-preparation':['preparationId','cooperationId','actorId','targetId','status','battleId','attempts'],
 'custody-auction':['action','auctionId','eventId','actorId','sellerId','targetId','status','highestBid','reserveGold','closesAt','settlement'],
 'custody-trade':['action','offerId','eventId','actorId','sellerId','buyerId','targetId','status','gold','expiresAt','deviceTerms','settlement'],
 'person-cooperation':['action','actorId','targetId','cooperationId','status','basis','membership'],
 'person-rescue':['action','actorId','targetId','rescueId','status'],
 'world-social':['action','actorId','targetId','relationId','status','factId','subject','messageId','costGold','dueAt'],
 'custody-logistics':['action','sourceId','actorId','at','facilityId','priceGold','targetId','permissionId','dutyId','escortId','minutes','before','after','interruption'],
 'person-duel-started':['battleId','actorId','targetId','battleKind'],
 'person-restraint-permission-decided':['decisionId','preparationId','actorId','targetId','itemId','accepted','permissionId'],
 'person-defeat-decided':['decisionId','actorId','targetId','defeatId','kind','result'],
 'person-captured':['actorId','targetId','custodyId','defeatId','restraintItemIds','effects'],
 'defeat-disposition':['actorId','targetId','sourceId','at','order','defeatId','battleId','hash','action','death'],
 'captive-searched':['actorId','targetId','itemId','sourceItemId','itemName','quantity','walletBefore','walletAfter'],
 'restraint-mode-changed':['actorId','targetId','itemId','oldMode','mode','effects','timer','limits','power'],
 'restraint-detached':['actorId','targetId','itemId'],
 'restraint-attached':['actorId','targetId','itemId','authority','effects'],
 'restraint-permitted':['actorId','targetId','itemId','permission'],
 'restraint-permission-revoked':['actorId','targetId','itemId','permissionId'],
 'restraint-permission-requested':['requestId','actorId','targetId','itemId','expiresAt'],
 'captive-released':['actorId','targetId','custodyId','detachedItemIds','remainingDeviceIds'],
 'solo-competition-created':['competitionId','venueId','competitionLevel','participantCount','temporaryCount','resolvedNpcMatches','championRewardPool','rewardProgressBefore'],
 'solo-competition-withdrawn':['competitionId','roundId','placement','reward'],
 'solo-competition-match-started':['competitionId','bracketMatchId','roundId','opponentParticipantId','opponentId','battleId'],
 'guide-choice':['enabled'],
 'expedition-started':['expeditionId','leaderId','dungeon','difficulty','mapSeed','availableNodeIds','companions','hirePayments','riskPreview','lootAgreement'],
 'expedition-narrative-required':['expeditionId','actorId','nodeId','roomType','danger','enemyCount','namingRequest','tutorial'],
 'expedition-interaction-entered':['expeditionId','actorId','nodeId','roomType','danger'],
 'expedition-combat-entered':['expeditionId','actorId','nodeId','roomType','danger','enemyCount','enemies','roomBudget','spent','residual','narrativeMechanicsHash','companions','arrival','battleId'],
 'expedition-beast-harvested':['expeditionId','actorId','nodeId','beastUnitId','monsterValue','integrity','efficiency','harvestBudget','harvestedValue','unconvertedRemainder','batches'],
 'expedition-beasts-harvested':['beastUnitIds','results'],
 'expedition-chest-opened':['expeditionId','actorId','nodeId','chestBudget','acquiredValue','unconvertedRemainder','batches'],
 'expedition-campfire-used':['expeditionId','actorId','nodeId','before','after','restorations'],
 'expedition-room-finished':['expeditionId','actorId','nodeId','roomType','availableNodeIds','acquiredBaseValue','expectedShopAcquisition','abandoned'],
 'expedition-cleared':[...extractionFields,'settledAllocation'],'expedition-safely-extracted':[...extractionFields,'settledAllocation'],
 'expedition-person-withdrawn':['actorId','expeditionId','agreementId','originEventIndex','from','to','destinationId','available','reason'],
 'story-extraction-confirmation':['expeditionId','nodeId','losses','decision','settlement'],
 'story-extraction-decided':['accepted','settlement'],
 'battle-strategy':['strategy'],
 'spar-started':['battleId','characterId','requestedCharacterId','opponentId','mode','noReward','noPhase','victoryExperience'],
 'martial-soul-switched':['unitId','previousSoulId','martialSoulId','endedStatusIds','endedDomainIds'],
};
function batches(rows:any[]){return rows.map(b=>{known(b,['fingerprint','displayName','quantity','unitValue','value','quality'],'实际材料批次');return {fingerprint:b.fingerprint,name:b.displayName,quantity:b.quantity,quality:copy(b.quality),unitAppraisal:b.unitValue,totalAppraisal:b.value,destination:'远征临时材料'};});}
function losses(rows:any[]){return rows.map(r=>{known(r,['kind','beastUnitId','name','years','pendingId'],'放弃项目');return pick(r,['kind','beastUnitId','name','years','pendingId']);});}
export function compileAllocation(a:any){if(!a)return null;known(a,['agreementId','playerId','locationId','materials','pendingMaterials','items','settledAt','distributions'],'返程分配');return {
 id:a.id,agreementId:a.agreementId,playerId:a.playerId,locationId:a.locationId,settledAt:copy(a.settledAt),
 materials:Object.values(a.materials).map((m:any)=>{known(m,['fingerprint','name','total','recipients','pending'],'材料分配');return {fingerprint:m.fingerprint,name:m.name,totalQuantity:m.total,deliveredTo:copy(m.recipients),pendingQuantity:m.pending};}),
 items:a.items.map((i:any)=>{known(i,['itemId','personId','containerId','status','sourceItemId','sourceQuantity','quantity','templateId','name','priorityId','targetKey','resolutionId','distributionId'],'实物分配');return {...pick(i,['itemId','personId','containerId','sourceItemId','sourceQuantity','quantity','templateId','name','priorityId','targetKey']),stage:i.status==='allocated'?'已交付':'暂存待分配'};})};}
export function compileAdventureReceipt(c:any):Record<string,any>{return {...compileAdventureBody(c),...pick(c,['actorId','leaderId','participantIds','expeditionId'])};}
function compileAdventureBody(c:any):Record<string,any>{
 const fields=ADVENTURE_RECEIPT_FIELDS[c.type];if(!fields)throw Error(`冒险回执缺少编译：${c.type}`);known(c,fields,c.type);
 switch(c.type){
 case 'cooperation-preparation':return {stage:authoredDescription(c.summary??'').replaceAll('看管','关押'),...pick(c,['preparationId','cooperationId','actorId','targetId','status','battleId']),attempts:c.attempts.map((a:any)=>pick(a,['itemId','at','status','reason']))};
 case 'person-cooperation':
 case 'person-rescue':return {stage:authoredDescription(c.summary??'').replaceAll('看管','关押'),...pick(c,fields)};
 case 'world-social':return {stage:authoredDescription(c.summary??'').replaceAll('看管','关押'),...pick(c,fields)};
 case 'custody-auction':return {stage:authoredDescription(c.summary??'').replaceAll('看管','关押'),...pick(c,fields)};
 case 'custody-trade':return {stage:authoredDescription(c.summary??'').replaceAll('看管','关押'),...pick(c,fields)};
 case 'custody-logistics':return {stage:authoredDescription(c.summary??'').replaceAll('看管','关押'),...pick(c,fields)};
 case 'person-duel-started':return {stage:'人物死斗已经开始，尚无战败处置结果',...pick(c,fields)};
 case 'person-restraint-permission-decided':return {stage:authoredDescription(c.summary??'').replaceAll('看管','关押'),...pick(c,fields)};
 case 'person-defeat-decided':return {stage:authoredDescription(c.summary??'').replaceAll('看管','关押'),...pick(c,fields)};
 case 'person-captured':return {stage:'已捕获并关押',...pick(c,fields)};
 case 'defeat-disposition':return {stage:c.action==='executed'?'明确处决已造成真实死亡':'已放弃本次战败处置，伤势与财物保留',...pick(c,fields)};
 case 'captive-searched':return {stage:'已实际搜取指定财物',...pick(c,fields)};
 case 'restraint-mode-changed':return {stage:c.mode==='limited'?'已按完整配置调节本器具的精细限制':c.mode==='released'?'装置仍佩戴，所提供限制已暂时解除':c.mode==='escort'?'装置已切换为押送模式':'装置已重新锁定',...pick(c,fields)};
 case 'restraint-detached':return {stage:'装置已实际拆下，再装配需要重新满足条件',...pick(c,fields)};
 case 'restraint-attached':return {stage:'已戴上拘束器',...pick(c,fields)};
 case 'restraint-permitted':return {stage:'本人已同意本次装配，许可限15分钟内使用一次，尚未装配',...pick(c,fields)};
 case 'restraint-permission-requested':return {stage:'已提出佩戴请求，等待对方回应',...pick(c,fields)};
 case 'restraint-permission-revoked':return {stage:'本人已撤回尚未使用的装配许可',...pick(c,fields)};
 case 'captive-released':return {stage:'本次关押已解除',...pick(c,fields)};
 case 'solo-competition-created':return {stage:'赛事报名完成，淘汰赛程已建立',venueName:rules.arena.COMPETITION_VENUES[c.venueId]?.name,...pick(c,ADVENTURE_RECEIPT_FIELDS[c.type])};
 case 'solo-competition-withdrawn':return {stage:'已退赛，按实际晋级成绩结算',...pick(c,['competitionId','roundId','placement','reward'])};
 case 'solo-competition-match-started':return {stage:'赛事对局已开始',...pick(c,ADVENTURE_RECEIPT_FIELDS[c.type])};
 case 'guide-choice':return {stage:'护航偏好已保存',useInitialGuide:c.enabled};
 case 'expedition-started':return {stage:'远征已建立，尚未进入首个房间，正在选择入口路线',expeditionId:c.expeditionId,destination:pick(c.dungeon,['id','name','locationId']),difficulty:pick(c.difficulty,['id','name']),availableNodeIds:copy(c.availableNodeIds),companions:copy(c.companions),hirePayments:c.hirePayments.map(compileHirePayment),riskAssessment:c.riskPreview?{scope:'出发时风险评估',...pick(c.riskPreview,['riskBand','reasons','player','routeLayers','ringYears','endurance','blocking'])}:null};
 case 'expedition-narrative-required':return {stage:'房间已生成，场景命名待完成',...pick(c,['nodeId','roomType','danger','enemyCount','tutorial'])};
 case 'expedition-interaction-entered':return {stage:'已进入非战斗房间',...pick(c,['nodeId','roomType','danger'])};
 case 'expedition-combat-entered':return {stage:'场景命名已完成，战斗已开始',...pick(c,['nodeId','roomType','danger','enemyCount','companions']),
  // The naming model's general description can mix appearance with invented mechanics.
  // Preserve it in the source receipt; this event projects settled identity only.
  enemies:c.enemies.map((b:any)=>{known(b,['unitId','name','years','monsterValue','description'],'遭遇魂兽');return pick(b,['unitId','name','years','monsterValue']);}),
  encounterStrengthBudget:{available:c.roomBudget,used:c.spent,unused:c.residual},mechanicsHash:c.narrativeMechanicsHash,...(c.arrival?{arrival:compileAdventureReceipt(c.arrival)}:{})};
 case 'expedition-beasts-harvested':return {stage:'指定魂兽已逐一完成采集',beastUnitIds:copy(c.beastUnitIds),harvests:c.results.map(compileAdventureReceipt)};
 case 'expedition-beast-harvested':return {stage:'魂兽材料已实际采集',beastUnitId:c.beastUnitId,...pick(c,['nodeId','integrity','efficiency']),materialAppraisal:{potential:c.harvestBudget,acquired:c.harvestedValue,unconverted:c.unconvertedRemainder},materials:batches(c.batches)};
 case 'expedition-chest-opened':return {stage:'宝箱已打开，材料进入远征临时库存',nodeId:c.nodeId,materialAppraisal:{potential:c.chestBudget,acquired:c.acquiredValue,unconverted:c.unconvertedRemainder},materials:batches(c.batches)};
 case 'expedition-campfire-used':return {stage:'营火已使用',nodeId:c.nodeId,restorations:c.restorations?.map((r:any)=>{known(r,['unitId','before','after'],'实际恢复');return {unitId:r.unitId,before:copy(r.before),after:copy(r.after),restoredHealth:r.after.health-r.before.health,restoredSoulPower:r.after.soulPower-r.before.soulPower};})??[{unitId:null,before:copy(c.before),after:copy(c.after),restoredHealth:c.after.health-c.before.health,restoredSoulPower:c.after.soulPower-c.before.soulPower}]};
 case 'expedition-room-finished':return {stage:'当前房间处理已结束，仍在远征中',...pick(c,['nodeId','roomType','availableNodeIds']),abandoned:losses(c.abandoned),cargoBaseAppraisal:c.acquiredBaseValue,estimatedSaleGold:c.expectedShopAcquisition};
 case 'expedition-cleared':case 'expedition-safely-extracted':return {stage:c.result==='cleared'?'首领房间已完成并安全返程':'已安全返程',...pick(c,['dungeonId','dungeonName','entranceLocationId','difficultyId','reason','completedNodeIds','movedItemIds','stashedItemIds','companions','allocationId']),expeditionId:c.expeditionId??null,totalCargoAppraisal:c.materialValue,allocation:compileAllocation(c.settledAllocation??c.allocation),abandoned:losses(c.abandoned??[])};
 case 'expedition-person-withdrawn':return {stage:'本人已从原远征现场自行返回入口',...pick(c,['actorId','expeditionId','agreementId','from','to'])};
 case 'story-extraction-confirmation':return {stage:({pending:'撤离损失等待玩家确认',accepted:'玩家已确认放弃并撤离',declined:'玩家选择留下'} as Record<string,string>)[c.decision],...pick(c,['expeditionId','nodeId']),losses:losses(c.losses),settlement:c.settlement?compileAdventureReceipt(c.settlement):null};
 case 'story-extraction-decided':return {stage:c.accepted?'玩家已确认放弃并撤离':'玩家选择留下',settlement:c.settlement?compileAdventureReceipt(c.settlement):null};
 case 'battle-strategy':known(c.strategy,['focusTargetId','protectTargetId','reservePercent','retreatPercent'],'战术');return {stage:'本场战术偏好已更新',preferences:copy(c.strategy)};
 case 'spar-started':return {stage:'切磋已开始',...pick(c,['battleId','characterId','requestedCharacterId','opponentId','mode']),victoryRewardRule:{enabled:!c.noReward,experience:c.victoryExperience},phaseTransitionEnabled:!c.noPhase};
 case 'martial-soul-switched':return {stage:'激活武魂已切换',actorId:c.unitId,previousSoulId:c.previousSoulId,martialSoulId:c.martialSoulId,endedStatusIds:copy(c.endedStatusIds),endedDomainIds:copy(c.endedDomainIds)};
 }
 throw Error(`冒险回执缺少实现：${c.type}`);
}
export function compileExpeditionContext(e:any){if(!e)return null;known(e,['dungeonId','dungeonName','phase','currentNodeId','completedNodeIds','companions','companionMeaning','room','routes','finish','extract'],'当前远征');
 const availability=(a:any)=>({available:a.available,reasons:copy(a.reasons),losses:losses(a.losses),...(Object.hasOwn(a,'boss')?{boss:a.boss}:{})});
 const stages:Record<string,string>={
  'awaiting-room':Array.isArray(e.completedNodeIds)?e.completedNodeIds.length?'上一房间已结束，正在选择下一条路线':'尚未进入首个房间，正在选择入口路线':'正在选择进入房间的路线',
  'awaiting-narrative':'已进入当前房间，场景资料待整理',combat:'已进入当前房间，正在交战',
  postcombat:'战斗已结束，仍在当前房间处理后续事务',interaction:'已进入非战斗房间，正在处理其中事务',
 };
 const room=e.room?{...pick(e.room,['nodeId','type','layer','campUsed','opened','description']),beasts:e.room.beasts.map((b:any)=>({
  ...pick(b,['unitId','name','years','appearance','categories','attributes','lifeStatus','harvested']),
  ...(b.abilities?{abilities:compileOwnedAbilities(b.abilities)}:{}),
 }))}:null;
 return {...pick(e,['id','dungeonId','dungeonName','phase','currentNodeId','completedNodeIds','companions','routes']),room,stage:stages[e.phase]??null,roomCompletion:availability(e.finish),extraction:availability(e.extract)};
}

/** Event prose for the author, derived only from the settled receipt, never player intent. */
export function adventureEventAccount(type:string,f:any,actor:string,person:(id:string)=>string,soul:(id:string)=>string=id=>id,item:(id:string)=>string=()=> '拘束器'):string{
 const room=({'普通战斗':'魂兽出没处','精英战斗':'强敌出没处','首领战斗':'首领所在处','火堆':'营地','宝箱':'宝箱处','事件':'际遇地点',combat:'战斗区域',elite:'强敌出没处',boss:'首领所在处',treasure:'宝箱处',chest:'宝箱处',camp:'营地',event:'际遇地点',rest:'休整处',exit:'出口'} as Record<string,string>)[f.roomType]??'这片区域';
 const restraint=()=>{const name=item(f.itemId);return name&&name!==f.itemId?name:'拘束器';};
 const companion=(c:any)=>`${c.name??person(c.unitId??c.personId??c.characterId)}${({guide:'（护航向导）',hired:'（雇佣同行）'} as Record<string,string>)[c.kind]??''}${c.leftAt?'（此前已离队，按本人实际行程处理）':''}`;
 const companions=(rows:any[])=>rows.length?rows.map(companion).join('、'):'无';
 const materials=(rows:any[])=>rows.map(m=>`${m.name}×${m.quantity}`).join('、')||'无';
 const losses=(rows:any[])=>rows.map(r=>r.name??r.kind).join('、')||'无';
 switch(type){
 case 'cooperation-preparation':return `${person(f.actorId)}为${person(f.targetId)}安排出战与战后器具设置：${f.stage}${f.attempts.map((a:any)=>`${item(a.itemId)}：${a.status==='failed'?`未能完成（${a.reason}）`:'已恢复约定设置'}`).join('；')}`;
 case 'person-cooperation':
 case 'person-rescue':return `${person(f.actorId)}：${f.stage}`;
 case 'world-social':return `${person(f.actorId)}：${f.stage}`;
 case 'custody-logistics':return `${person(f.actorId)}：${f.stage}`;
 case 'person-duel-started':return `${person(f.actorId)}与${person(f.targetId)}开始死斗。`;
 case 'person-restraint-permission-decided':return `${person(f.actorId)}回应了这次佩戴请求：${f.stage}`;
 case 'person-defeat-decided':return `${person(f.actorId)}决定如何处置${person(f.targetId)}：${f.stage}`;
 case 'person-captured':return `${person(f.actorId)}使用${f.restraintItemIds.length}件拘束器制住了${person(f.targetId)}，开始关押。`;
 case 'defeat-disposition':return `${person(f.actorId)}对${person(f.targetId)}的本次死斗处置：${f.stage}。`;
 case 'captive-searched':return `${person(f.actorId)}从${person(f.targetId)}处搜取${f.itemId?f.itemName+'×'+f.quantity:'钱币'+f.quantity}。双方钱包：${f.walletBefore.actor}→${f.walletAfter.actor}、${f.walletBefore.target}→${f.walletAfter.target}。`;
 case 'restraint-mode-changed':case 'restraint-detached':return `${person(f.actorId)}操作${person(f.targetId)}佩戴的${restraint()}：${f.stage}。`;
 case 'restraint-attached':return `${person(f.actorId)}给${person(f.targetId)}戴上了${restraint()}。`;
 case 'restraint-permitted':return `${person(f.actorId)}同意由${person(f.targetId)}给自己戴上${restraint()}一次，15分钟内有效。`;
 case 'restraint-permission-requested':return `${person(f.actorId)}已当面向${person(f.targetId)}请求本次装配，等待本人回应。`;
 case 'restraint-permission-revoked':return `${person(f.actorId)}已撤回给${person(f.targetId)}的这次装配许可。`;
 case 'custody-auction':return `${person(f.sellerId)}对${person(f.targetId)}发起的奴隶拍卖：起拍价${f.reserveGold}金魂币，${f.highestBid?`最高出价为${person(f.highestBid.personId)}的${f.highestBid.gold}金魂币`:'尚无出价'}。${f.stage}`;
 case 'custody-trade':return `${person(f.sellerId)}向${person(f.buyerId)}提出${f.gold>0?`以${f.gold}金魂币出售`:'无偿转交'}${person(f.targetId)}。${f.stage}`;
 case 'captive-released':return `${person(f.actorId)}解除对${person(f.targetId)}的本次关押，拆下${f.detachedItemIds.length}件拘束器${f.remainingDeviceIds.length?`，身上还戴着${f.remainingDeviceIds.length}件拘束器`:''}。`;
 case 'solo-competition-created':return `${actor}已在${f.venueName??f.venueId}报名${f.competitionLevel}级组，${f.participantCount}人淘汰赛程已建立。`;
 case 'solo-competition-withdrawn':return `${actor}已退出本届比赛，按实际晋级成绩结算奖励。`;
 case 'solo-competition-match-started':return `${actor}与${person(f.opponentId)}的${({R16:'十六强',QF:'八强',SF:'半决赛',F:'决赛'} as Record<string,string>)[f.roundId]??f.roundId}对局已开始。`;
 case 'guide-choice':return `${actor}已${f.useInitialGuide?'启用':'暂停'}免费护航安排。`;
 case 'expedition-started':return `${actor}已开始前往${f.destination.name??'目的地'}的远征，难度为${f.difficulty.name??'当前所选难度'}。同行：${companions(f.companions)}。${f.hirePayments.map((p:any)=>`已从预付款中向${person(p.payeeId)}支付${p.amount}金魂币。`).join('')}前方有${f.availableNodeIds.length}条路线可选。`;
 case 'expedition-narrative-required':return `${actor}已抵达${room}，危险程度${f.danger}，附近有${f.enemyCount}个敌人。正在补全场景与魂兽的介绍。`;
 case 'expedition-interaction-entered':return `${actor}已进入${room}，危险程度${f.danger}。`;
 case 'expedition-combat-entered':return `${actor}已进入${room}，同行：${companions(f.companions)}。遭遇${f.enemies.map((e:any)=>`${e.name??person(e.unitId)}${Number.isFinite(e.years)?`（${e.years}年）`:''}`).join('、')}，战斗已开始。`;
 case 'expedition-beast-harvested':return `${actor}已从${person(f.beastUnitId)}采集${materials(f.materials)}，放入本次行囊，估值${f.materialAppraisal.acquired}金魂币。`;
 case 'expedition-beasts-harvested':return f.harvests.map((h:any)=>adventureEventAccount('expedition-beast-harvested',h,actor,person)).join('\n');
 case 'expedition-chest-opened':return `${actor}已打开宝箱，取得${materials(f.materials)}，放入本次行囊，估值${f.materialAppraisal.acquired}金魂币。`;
 case 'expedition-campfire-used':return `${actor}使用营火休整。`+f.restorations.map((r:any)=>`${r.unitId?person(r.unitId):actor}实际恢复生命${r.restoredHealth}、魂力${r.restoredSoulPower}。`).join('');
 case 'expedition-room-finished':return `${actor}已结束对${room}的探索，放弃的收获：${losses(f.abandoned)}。${f.availableNodeIds.length?`前方有${f.availableNodeIds.length}条路线可选。`:'当前路线已走完。'}`;
 case 'expedition-cleared':case 'expedition-safely-extracted':return `${actor}${f.stage}，本次同行：${companions(f.companions??[])}。放弃项目：${losses(f.abandoned)}。带回物资估值${f.totalCargoAppraisal}金魂币。`;
 case 'expedition-person-withdrawn':return `${person(f.actorId)}已独自从原远征现场返回入口。`;
 case 'story-extraction-confirmation':return `${f.stage}；涉及损失：${losses(f.losses)}。${f.settlement?adventureEventAccount('expedition-safely-extracted',f.settlement,actor,person):'尚未执行撤离结算。'}`;
 case 'story-extraction-decided':return `${f.stage}。${f.settlement?adventureEventAccount('expedition-safely-extracted',f.settlement,actor,person):'未执行撤离结算。'}`;
 case 'spar-started':return `${actor}与${person(f.opponentId??f.characterId)}的${f.mode}切磋已开始。`;
 case 'battle-strategy':return `${actor}已更新本场战术：优先攻击${f.preferences.focusTargetId?person(f.preferences.focusTargetId):'未指定'}，优先支援${f.preferences.protectTargetId?person(f.preferences.protectTargetId):'未指定'}；保留魂力${f.preferences.reservePercent}%，生命撤退阈值${f.preferences.retreatPercent}%。`;
 case 'martial-soul-switched':return `${person(f.actorId)}已将激活武魂从${f.previousSoulId?soul(f.previousSoulId):'无'}切换为${soul(f.martialSoulId)}；结束${f.endedStatusIds.length}项状态、${f.endedDomainIds.length}项领域。`;
 default:throw Error(`冒险经过缺少编译：${type}`);
 }
}
