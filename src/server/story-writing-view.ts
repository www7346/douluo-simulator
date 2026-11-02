import type {StoryWritingFacts} from '../runtime/story-writing-facts';
import type {StoryWritingPackage} from './story-writing-package';
import {ordinaryBattleAccountStatement} from '../runtime/story-battle-ordinary-account';
import {settledBattleChangesReading,battleActionConditionsReading} from '../runtime/story-battle-action-reading';
import {battleLifecycleReading} from '../runtime/story-battle-lifecycle-reading';
import {BATTLE_WHOLE_REFERENCE_FIELDS,BATTLE_WORLD_PARTICIPANT_FIELDS} from './story-battle-writing-reference';
import {storyWritingPersonReferences} from '../runtime/story-writing-person-scope';
import {projectCommerceWritingFacts} from '../runtime/story-commerce-reading';

export interface WritingSelection {
 sourcePath:string; retained:boolean; reason:string; sourceCharacters:number; sentCharacters:number;
}
const size=(value:unknown)=>JSON.stringify(value)?.length??0;

function elapsedTimeReading(minutes:number){
 const hours=Math.floor(minutes/60),remaining=minutes%60;
 const clockTime=[hours&&`${hours}小时`,remaining&&`${remaining}分钟`].filter(Boolean).join('')||'0分钟';
 if(!hours||remaining)return clockTime;
 const periods=Math.floor(hours/2);
 const traditional=hours%2?(periods?`${periods}个半时辰`:'半个时辰'):`${periods}个时辰`;
 return `${clockTime}（${traditional}）`;
}

/** Select from a frozen, audience-filtered source; never query or change the world here. */
export function selectStoryWritingView(source:StoryWritingPackage,commerceProjection=true){
 const facts:StoryWritingFacts=structuredClone(source.facts),selection:WritingSelection[]=[];
 const actions=new Set(facts.events.map(event=>event.action));
 // A battle-report turn can retain the original departure/entry receipts. Its
 // existing battle identity, not the names of those earlier actions, defines scope.
 const pureBattleReport=Boolean(source.origin.battleId&&facts.events.some(e=>e.facts.battle?.id===source.origin.battleId))
  ||facts.events.length>0&&facts.events.every(e=>e.action==='battle-report'&&e.facts.battle);
 const groups=new Set(facts.events.map(event=>event.group));
 const references=new Set<string>();
 const collect=(value:unknown):void=>{
  if(typeof value==='string')references.add(value);
  else if(value&&typeof value==='object')Object.values(value).forEach(collect);
 };
 // References come from executed/query events, changes, active obligations and known interactions.
 // Do not seed with every item in an unrelated catalogue, which would select the catalogue itself.
 collect(facts.events);collect(facts.changes);collect(facts.continuity.people);
 collect(facts.continuity.narrativeObjects);collect(facts.continuity.personalKnowledge);
 for(const [key,value] of Object.entries(facts.pending))if(!['workshop','rings'].includes(key))collect(value);
 const referenced=(value:any):boolean=>{
  if(!value||typeof value!=='object')return false;
  return Object.entries(value).some(([key,v])=>
   ['id','itemId','blueprintId','templateId','fingerprint','pendingId','researchId','ringId'].includes(key)&&typeof v==='string'&&references.has(v)
   ||v&&typeof v==='object'&&referenced(v));
 };
 const entry=(path:string,value:unknown,retained:boolean,reason:string)=>{
  selection.push({sourcePath:path,retained,reason,sourceCharacters:size(value),sentCharacters:retained?size(value):0});
 };
 const choose=(container:Record<string,any>,key:string,path:string,keep:boolean,reason:string)=>{
  if(!Object.hasOwn(container,key))return;
  entry(`${path}/${key}`,container[key],keep,reason);
  if(!keep)delete container[key];
 };
 // Only a complete, fully recorded battle establishes that a basic action was
 // unused. Mixed queries and incomplete evidence retain the capability catalogue.
 // Identity is owner + soul + actual skill ID; shared names never imply shared use.
 const battleReferences=facts.events.filter(e=>e.facts.battle).map(e=>e.facts.wholeBattleReference??e.facts.battle);
 const knownBattleUsage=pureBattleReport&&battleReferences.length>0
  &&facts.events.every(e=>e.facts.battle||e.action==='describe')
  &&battleReferences.every(b=>b.completeFromStart===true&&Number.isSafeInteger(b.evidenceCoverage?.actions)
   &&b.evidenceCoverage.actions===b.evidenceCoverage.stateLifecycle&&Array.isArray(b.usedAbilities)
   &&b.usedAbilities.every((a:any)=>typeof a.actorId==='string'&&typeof a.id==='string'&&typeof a.sourceMartialSoulId==='string'));
 const usedBasics=new Set(battleReferences.flatMap(b=>(b.usedAbilities??[]).filter((a:any)=>a.id==='martial.base').map((a:any)=>JSON.stringify([a.actorId,a.sourceMartialSoulId]))));
 const selectSoulCatalogue=(person:any,path:string)=>{
  for(const [s,soul] of (person.martialSouls??[]).entries())if(soul.meaning){
   const at=`${path}/martialSouls/${s}/meaning`;
   choose(soul.meaning,'development',at,false,'未来魂环发展目录不属于本场已经发生的行动；完整资料保留来源包');
   if(knownBattleUsage&&typeof person.id==='string'&&typeof soul.id==='string')
    choose(soul.meaning,'basicAction',at,usedBasics.has(JSON.stringify([person.id,soul.id])),'按本场真实施展者、武魂身份及基础招式选择；未施展的动作目录留完整来源，身份、形态、特性及弱点保留');
  }
 };
 // Preserve whole answers and ordered receipts, including failed, skipped and conditional actions.
 for(const key of ['version','turn','scene','participants','events','changes'] as const)
  entry(`/${key}`,facts[key],true,key==='participants'?'当前人物身份、性格、关系与实际行动限制':'本轮完整事实与顺序');
 for(const [index,event] of facts.events.entries())if(event.facts.battle){
  const battle=event.facts.battle,path=`/events/${index}/facts/battle`;
  if(source.origin.writingSection){
   if(!event.facts.wholeBattleReference)throw Error('战报阶段缺少独立的全场参考资料');
   for(const key of BATTLE_WHOLE_REFERENCE_FIELDS)choose(battle,key,path,false,'整场资料独立置于wholeBattleReference，当前阶段只呈现对应经过和检查点');
   choose(event.facts,'wholeEventStatement',`/events/${index}/facts`,false,'全场概括已保留于wholeBattleReference.eventStatement');
   if(!source.origin.writingSection.includesEnding)for(const key of ['eventStatement','status','outcome','closing','usedAbilities','endingActions','evidenceCoverage','worldParticipants'])
    choose(event.facts.wholeBattleReference,key,`/events/${index}/facts/wholeBattleReference`,false,'晚于本段的全场及战后信息留完整来源；当前阶段读取实际起止、经过与当时已知背景');
   for(const [personIndex,person] of (event.facts.wholeBattleReference.worldParticipants?.records??[]).entries()){
    const personPath=`/events/${index}/facts/wholeBattleReference/worldParticipants/records/${personIndex}`;
    if(person.actionState)choose(person.actionState,'abilityConditions',personPath+'/actionState',false,'战后可用动作目录不属于本场实际执行；完整目录保留来源包');
    selectSoulCatalogue(person,personPath);
   }
  }
  for(const [personIndex,person] of (event.facts.battleBackground?.participants??[]).entries()){
   const personPath=`/events/${index}/facts/battleBackground/participants/${personIndex}`;
   for(const key of ['abilities','items'])choose(person,key,personPath,false,'背景保留人物和武魂身份；实际施展与消耗由本场逐项回执说明');
   if(person.actionState)choose(person.actionState,'abilityConditions',personPath+'/actionState',false,'可用动作菜单不是已经执行的动作；当时已有状态及实际行动约束另有记录');
   selectSoulCatalogue(person,personPath);
  }
  if(!battle.account)throw Error('战斗写作缺少实际经过编译');
  for(const key of ['actions','phaseBoundaries','phases','course'])choose(battle,key,path,false,'按时间排列的account同时保留实际施展、后果、资源历程和关键变化；并行阶段统计与逐动作明细留完整证据');
  entry(path+'/account',battle.account,true,'普通交锋概括，具体变化保留，源动作均可追溯');
  const whole=event.facts.wholeBattleReference??battle;
  for(const [abilityIndex,ability] of (whole.usedAbilities??[]).entries())
   choose(ability,'useSummary',`/events/${index}/facts/${event.facts.wholeBattleReference?'wholeBattleReference':'battle'}/usedAbilities/${abilityIndex}`,false,'全场累计使用统计留完整来源；实际施展、目标与后果按account的发生顺序表达，招式身份保留');
  const names=new Map<string,string>([...(whole.opening?.units??[]),...(whole.closing?.units??[])].map((unit:any)=>[unit.id,unit.name]));
  const display=(id:string)=>{const name=names.get(id)??id;return [...names.values()].filter(value=>value===name).length>1?`${name}（${id}）`:name;};
  const lifecycle=(row:any,at:string)=>{
   if(row.lifecycleReading&&JSON.stringify(row.lifecycleReading)===JSON.stringify(battleLifecycleReading(row,display))){
    for(const key of ['statusLifecycle','fieldLifecycle'])choose(row,key,at,false,'状态与区域变化按共同事件序号编为中文，原快照和所有来源留证据');
   }else choose(row,'lifecycleReading',at,false,'生命周期资料未完整表达或与当前来源不符，保留完整原结构');
  };
  if(battle.openingSettlement)lifecycle(battle.openingSettlement,path+'/openingSettlement');
  for(const [p,passage] of battle.account.passages.entries())if(passage.kind==='具体经过'&&passage.statement){
   const event=passage.event,at=`${path}/account/passages/${p}/event`,reason='相同原文已编入本项具体经过；完整结构留在源证据中';
   const originalChanges=event.stateChanges;
   const changes=settledBattleChangesReading(originalChanges,display);
   if(changes!==null&&changes.every(line=>passage.statement.includes(line)))
    choose(event,'stateChanges',at,false,'已记录状态转折与阶段逐项编入当前经过；完整前后值留源证据');
   if(Array.isArray(originalChanges)&&!Object.hasOwn(event,'stateChanges')&&event.movement){
    const move=event.movement,position=originalChanges.find((c:any)=>c.subjectId===event.actor.id&&c.field==='实际位置');
    const contained=(a:any,b:any)=>a&&b&&Object.entries(a).every(([key,v])=>JSON.stringify(v)===JSON.stringify(b[key]));
    for(const [key,state] of [['from','before'],['to','after']] as const)if(position&&contained(move[key],position[state]))
     choose(move,key,at+'/movement',false,'移动位置逐字段等同本项实际位置变化，完整端点已编入同一statement');
   }
   const lead=`第${event.round}回合，按发生顺序第${event.sequence}项：${display(event.actor.id)}`;
   if(passage.statement.startsWith(lead))for(const key of ['round','sequence'])choose(event,key,at,false,'发生回合与顺序已编入本项statement，sourceSequences保留原动作映射');
   if(event.stage&&passage.statement.includes(event.stage))choose(event,'stage',at,false,'本次执行阶段已完整编入同一statement');
   if(event.actionConditionsReading&&event.actionConditionsReading===battleActionConditionsReading(event.actionStateBefore))
    choose(event,'actionStateBefore',at,false,'当前行动限制已由原字段完整编为中文；未知字段保留结构');
   else choose(event,'actionConditionsReading',at,false,'条件资料未完整表达或与当前源字段不符，使用完整原结构');
   lifecycle(event,at);
   for(const key of ['resources','actualOutcomes'])choose(event,key,at,false,reason);
   if(event.itemUse)choose(event.itemUse,'statement',at+'/itemUse',false,reason);
   if(event.skill?.sourceReading&&passage.statement.includes(event.skill.sourceReading))choose(event.skill,'sourceReading',at+'/skill',false,'本次实际施展来源已直接编入同一动作经过；冻结身份和招式总览仍可查');
   const results=event.results??[];
   const resultsExpressed=results.every((result:any)=>typeof result.statement==='string'&&passage.statement.includes(result.statement)
    &&(result.effects??[]).every((effect:any)=>(effect.results??[]).every((outcome:any)=>typeof outcome.fact==='string'&&passage.statement.includes(outcome.fact))));
   choose(event,'results',at,!resultsExpressed,resultsExpressed?'目标、命中、生效及逐项实际后果已完整编入中文经过；原目标结果树保留完整证据':'目标结果尚未完整表达，保留原资料');
  }else if(passage.kind==='交锋概括'){
   const at=`${path}/account/passages/${p}`,compiled=ordinaryBattleAccountStatement(passage);
   if(compiled!==null&&passage.statement===compiled){
    for(const key of ['exchanges','resources','recordedValues','actualDescriptions'])choose(passage,key,at,false,'普通交锋的对象、时段、实际判定、后果、资源范围和补充记录已等价编入本段经过；统计树留完整来源，末次交锋及全部动作映射保留');
   }
  }
  // Keep one chronological reading before end-state and capability references.
  // Previously the reader traversed the final outcome, every ability summary,
  // and the closing frame before reaching the actual course of the battle.
  const order=['id','completeFromStart','writingInterval','opening','openingSettlement','course','account','closing','settlement','aftermath','status','outcome','usedAbilities','endingActions','evidenceCoverage'];
  event.facts.battle=Object.fromEntries([...order.filter(key=>Object.hasOwn(battle,key)),...Object.keys(battle).filter(key=>!order.includes(key))].map(key=>[key,battle[key]]));
 }
 // A pure report describes performed actions. The battle's usedAbilities and itemUse
 // are complete sources; unrelated post-battle capability/possession menus stay in evidence.
 if(pureBattleReport){
  if(source.origin.writingSection&&!source.origin.writingSection.includesEnding){
   for(const key of Object.keys(facts.scene))choose(facts.scene,key,'/scene',false,'写作回合可能在战后创建；本段场景取有真实观察时点的battleBackground与战斗检查点');
   for(const key of Object.keys(facts.continuity))choose(facts.continuity,key,'/continuity',false,'本轮结束背景留完整来源；战前已知关系、约定和经历由battleBackground保留');
   for(const key of Object.keys(facts.pending))choose(facts.pending,key,'/pending',false,'战后待办不提前送入尚未结束的战斗阶段；已知原约定保留于battleBackground');
   for(const [index,person] of facts.participants.entries())for(const key of Object.keys(person))if(!['id','name'].includes(key))
    choose(person,key,`/participants/${index}`,false,'这里只保留参战身份索引；人物背景采用战前真实观察，战中状态采用当前阶段记录');
  }
  choose(facts.continuity,'openingGuidance','/continuity',false,'独立战报不使用未来开局方向菜单；开局处境与实际义务仍保留');
  choose(facts.continuity,'party','/continuity',false,'独立战报的实际参战人物和同行来自本场记录；出发前队伍安排保留完整来源');
  for(const [index,person] of facts.participants.entries()){
   if(person.afterTurn){
    if(source.origin.writingSection)choose(person,'afterTurn',`/participants/${index}`,false,'本轮结束状态在wholeBattleReference.worldParticipants中，当前阶段检查点另列');
    else{
     for(const key of BATTLE_WORLD_PARTICIPANT_FIELDS)if(Object.hasOwn(person.afterTurn,key)&&JSON.stringify(person[key])===JSON.stringify(person.afterTurn[key]))
      choose(person,key,`/participants/${index}`,false,'本轮结算后的世界值统一置于afterTurn；交锋中的数值来自对应战斗时点');
     if(person.afterTurn.actionState)choose(person.afterTurn.actionState,'abilityConditions',`/participants/${index}/afterTurn/actionState`,false,'战后动作菜单保留完整来源，本场施展读取实际回执');
     selectSoulCatalogue({...person.afterTurn,id:person.id},`/participants/${index}/afterTurn`);
    }
   }
   if(source.origin.writingSection)for(const key of BATTLE_WORLD_PARTICIPANT_FIELDS)
    choose(person,key,`/participants/${index}`,false,'本轮结算后世界状态置于wholeBattleReference.worldParticipants；本段行动时点读取writingInterval和实际经过');
   for(const key of ['abilities','items'])choose(person,key,`/participants/${index}`,false,'纯战报使用实际施展招式及物品回执；持有目录保留完整来源');
   selectSoulCatalogue(person,`/participants/${index}`);
   if(person.actionState)choose(person.actionState,'abilityConditions',`/participants/${index}/actionState`,false,'战后可用动作目录不属于本场实际执行；实际限制仍在各动作原时点资料');
  }
 }
 // Equivalent identity/history records need only one reading. Compare complete
 // selected values, keep changed records and their separate observation times,
 // and never merge combat resources/conditions merely because endpoints match.
 if(pureBattleReport){
  const backgrounds=facts.events.flatMap((event,index)=>(event.facts.battleBackground?.participants??[]).map((person:any)=>({person,index,background:event.facts.battleBackground})));
  const identical=(id:string,key:string,value:any)=>backgrounds.find(b=>b.person.id===id&&Object.hasOwn(b.person,key)&&JSON.stringify(b.person[key])===JSON.stringify(value));
  const selectEquivalent=(person:any,path:string,keys:string[],id=person.id)=>{
   for(const key of keys)if(Object.hasOwn(person,key)){
    const earlier=identical(id,key,person[key]);
    if(earlier)choose(person,key,path,false,`完整相同的资料已保留于/events/${earlier.index}/facts/battleBackground/participants；其观察时点仍在，变化资料不合并`);
   }
  };
  for(const [i,person] of facts.participants.entries()){
   selectEquivalent(person,`/participants/${i}`,['playerLabels','identity','occupation','characterization','personality','speechStyle','canonicalId','registration','eraBasis']);
   if(person.afterTurn)selectEquivalent(person.afterTurn,`/participants/${i}/afterTurn`,['level','rank','martialSouls','ownedRings'],person.id);
  }
  for(const [i,event] of facts.events.entries())for(const [j,person] of (event.facts.wholeBattleReference?.worldParticipants?.records??[]).entries())
   selectEquivalent(person,`/events/${i}/facts/wholeBattleReference/worldParticipants/records/${j}`,['level','rank','martialSouls','ownedRings']);
  for(const [i,person] of (facts.continuity.people??[]).entries())for(const key of Object.keys(person))if(key!=='personId'){
   const earlier=backgrounds.find(b=>b.person.id===person.personId&&b.background.continuity.people?.some((p:any)=>p.personId===person.personId&&Object.hasOwn(p,key)&&JSON.stringify(p[key])===JSON.stringify(person[key])));
   if(earlier)choose(person,key,`/continuity/people/${i}`,false,`完整相同的既有经历已保留于/events/${earlier.index}/facts/battleBackground/continuity/people；新增或变更经历仍按战后时点保留`);
  }
 }
 // Keep owned capability descriptions and active constraints. An unused, unrestricted
 // action-menu catalogue is not an event in an ordinary conversation. Queries and
 // performed actions referencing an ability retain its complete condition catalogue.
 const requiredCapabilities=new Set<number>();
 for(const [index,person] of facts.participants.entries()){
  const state=person.actionState,menu=state?.abilityConditions;
  if(!menu){requiredCapabilities.add(index);continue;}
  const relevant=Boolean(state.battle||state.activeStatuses?.length||menu.actions?.some((action:any)=>
   [action.id,action.sourceItemId,action.sourceRingId,action.sourceMartialSoulId].some(id=>typeof id==='string'&&id.length>0&&references.has(id))
   ||action.selfConditionsMet!==true||action.cooldownRemaining>0||action.activationLock>0
   ||action.perBattleUsed>0||action.perBattleGroupUsed>0||action.dailyUsed>0
   ||action.perBattleRemaining===0||action.perBattleGroupRemaining===0||action.dailyRemaining===0));
  if(relevant||!Array.isArray(menu.actions))requiredCapabilities.add(index);
  choose(state,'abilityConditions',`/participants/${index}/actionState`,relevant,relevant?'本轮引用的能力、进行中战斗或实际状态与使用限制':'本轮没有引用或限制的可用动作菜单；能力描述和人物当前状态保留，完整菜单留在源包');
 }
 // Only settled mechanical work can establish an uninvolved bystander. Keep
 // unknown/mixed/social scenes and every actor, target, explicit mention and
 // obligation. The whole history roster is not evidence of acting this turn.
 const mechanicalGroups=new Set(['财物与装备','成长','工坊查询','工坊结算']);
 const settledMechanical=!pureBattleReport&&facts.events.length>0&&facts.events.every(event=>
  mechanicalGroups.has(event.group)&&event.status==='执行成功'&&!event.facts.battle&&typeof event.source.actorId==='string'&&event.source.actorId.length>0);
 if(settledMechanical){
  const involved=storyWritingPersonReferences(facts.events,facts.changes,[facts.events.map(event=>event.query),facts.pending,facts.continuity.narrativeObjects,facts.continuity.personalKnowledge]);
  for(const [index,person] of facts.participants.entries()){
   const mentioned=typeof person.name==='string'&&person.name.length>0&&facts.events.some(event=>event.intent.includes(person.name));
   const keep=typeof person.id!=='string'||involved.has(person.id)||mentioned||requiredCapabilities.has(index)
    ||referenced(person.abilities)||referenced(person.martialSouls)||referenced(person.ownedRings);
   choose(person,'abilities',`/participants/${index}`,keep,keep?'本轮参与、提及、待办、能力引用或实际限制需要完整招式目录':'已结算事务中未参与人物的招式目录留完整来源；人物身份、武魂、状态、性格、关系和经历仍保留');
  }
 }
 const commerce=[...actions].some(a=>['buy','sell','sell-item','sell-material','supply-buy','quote-item-sale','quote-material-sale'].includes(a));
 const materialWork=groups.has('工坊查询')||groups.has('工坊结算');
 const itemWork=groups.has('财物与装备')||groups.has('魂环')||materialWork;
 const inventoryRelevant=itemWork||!pureBattleReport&&(referenced(facts.continuity.inventory)
  ||facts.changes.some(change=>change.field.startsWith('物品数量：')||change.field.startsWith('携带状态：')));
 const materialsRelevant=materialWork||actions.has('sell-material')||referenced(facts.continuity.materials)
  ||facts.changes.some(change=>change.field.startsWith('永久材料：')||change.field.startsWith('远征暂存材料：'));
 // Future action menus are not facts about an executed action. Preserve stable array
 // indices and every actual limit/receipt; only remove catalogue fields in this view.
 const custody=facts.continuity.custody;
 if(custody){
  for(const [index,held] of (custody.held??[]).entries())for(const [deviceIndex,device] of (held.devices??[]).entries())
   choose(device,'choices',`/continuity/custody/held/${index}/devices/${deviceIndex}`,false,'尚未选择的能力许可菜单留在操作界面；当前许可和限制完整保留');
  if(custody.logistics)for(const field of ['destinations','guardCandidates','escortCandidates','templates'])
   choose(custody.logistics,field,'/continuity/custody/logistics',false,'可选地点、房型和人选是操作菜单；实际场所、看守、押送与期限保留');
 }
 const handledContinuity=new Set(['inventory','materials','commerce']);
 choose(facts.continuity,'inventory','/continuity',inventoryRelevant,inventoryRelevant?'本轮财物行动、变化或已记录交互引用':pureBattleReport?'纯战报只读实际物品使用、效果和变化；战后持有目录保留完整来源':'本轮无库存行动、变化或交互引用；完整库存保留在来源包');
 choose(facts.continuity,'materials','/continuity',materialsRelevant,materialsRelevant?'本轮材料条件、实际变化或引用':'本轮无材料条件、变化或引用；完整材料保留在来源包');
 const commerceRelevant=commerce||referenced(facts.continuity.commerce);
 choose(facts.continuity,'commerce','/continuity',commerceRelevant,commerceRelevant?'本轮交易或相关物品、委托引用':'本轮无交易或报价引用；非本轮历史交易与当地货架不发送');
 for(const [key,value] of Object.entries(facts.continuity))if(!handledContinuity.has(key))
  entry(`/continuity/${key}`,value,true,'保留已按知情范围过滤的经历、交流、场景限制；未定义筛选规则的资料不静默删除');
 for(const [key,value] of Object.entries(facts.pending)){
  if(key==='workshop'&&value&&typeof value==='object'){
   for(const [field,part] of Object.entries(value)){
    const keep=materialWork||field!=='ownedBlueprints'||referenced(part);
    choose(value,field,'/pending/workshop',keep,keep?'本轮工坊需求、引用或未完成研发及进入条件':'本轮未涉及且无引用的已有图纸目录');
   }
  }else if(key==='rings'&&value&&typeof value==='object'){
   for(const [field,part] of Object.entries(value)){
    const keep=groups.has('魂环')||field!=='carriedSources'||referenced(part);
    choose(value,field,'/pending/rings',keep,keep?'本轮魂环需求、引用、当前来源或未完成候选':'本轮未涉及且无引用的随身魂环来源目录');
   }
  }else entry(`/pending/${key}`,value,true,'保留既有未决事项、世界安排和规则约束');
 }
 if(commerceProjection){
  const projected=projectCommerceWritingFacts(facts);
  for(const [key,value]of Object.entries(projected))Object.assign(facts,{[key]:value});
  entry('/continuity/commerce',facts.continuity.commerce,true,'拍品身份、报价、资金资格和当前状态完整保留；本轮点名、实际行动或单件查看保留原完整quote，其他原始定价与图留单件查看');
 }
 for(const event of facts.events){
  const time=event.facts.time;
  if(Number.isSafeInteger(time?.elapsedMinutes)&&time.elapsedMinutes>=0)time.elapsedReading=elapsedTimeReading(time.elapsedMinutes);
 }
 // Read the actual event course before profile/catalogue references. Key ordering
 // changes presentation only; review pointers and the frozen source stay stable.
 const orderedFacts:StoryWritingFacts=Object.fromEntries([...new Set(['version','turn','scene','events',...Object.keys(facts)])].map(key=>[key,(facts as any)[key]])) as unknown as StoryWritingFacts;
 return {sourcePackageId:source.id,sourceFactsHash:source.factsHash,facts:orderedFacts,selection,
  sourceCharacters:size(source.facts),sentCharacters:size(facts)};
}
export type StoryWritingView=ReturnType<typeof selectStoryWritingView>;
