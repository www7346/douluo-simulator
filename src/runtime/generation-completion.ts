import {rules} from '../rules';
import {validateCharacterProfile,type CharacterProfile} from './character-profile';

export interface GenerationTarget {kind:'person'|'skill'|'soul-base';id:string;fingerprint:string;value:any;ownerId?:string;allowPersonalName?:boolean}
export interface GenerationLabel {kind:GenerationTarget['kind'];id:string;fingerprint:string;name?:string;description?:string;profile?:CharacterProfile;profileSource?:'preset'|'existing'}
export function generationFingerprint(value:any):string {
 const text=JSON.stringify(value?.effectGraph||value?.效果图||value?.effectSpecs?rules.abilities.mechanics(value):value);
 let hash=14695981039346656037n;for(let i=0;i<text.length;i++)hash=BigInt.asUintN(64,(hash^BigInt(text.charCodeAt(i)))*1099511628211n);return hash.toString(16).padStart(16,'0');
}
export function hasGeneratedName(skill:any){const source=skill.namingSource??skill.扩展?.namingSource??skill.扩展?.命名来源??skill.扩展?.generationNaming?.source;return source==='preset'||source==='ring-design'||source?.startsWith('background-local')||source?.startsWith('llm')||!!skill.扩展?.originalName&&String(skill.扩展?.evidence).startsWith('canon-');}

/** The workshop already settled the selected product's name and description.
 * Check the actual source item and blueprint, including old locally named products. */
function hasSettledWorkshopName(state:any,skill:any,item:any):boolean {
 const source=item?.payload?.activeSkill;
 const blueprint=state.研发?.蓝图?.[item?.payload?.blueprintId];
 if(!blueprint||!source?.name||!source.description||skill.name!==source.name||skill.description!==source.description)return false;
 if(item.payload.skillId!==skill.id&&!item.payload.skillIds?.includes(skill.id))return false;
 return rules.expedition.validateBlueprintProductItem(item,blueprint);
}

/** Compare scratch execution with its source. Reading an old save is never a repair. */
export function generationTargets(before:any,after:any,repairIds:string[]=[],retainedLabels?:ReadonlySet<string>):GenerationTarget[]{
 const result:GenerationTarget[]=[],repair=new Set(repairIds);
 // A result signed before catalogue names shipped may already contain paid text for these exact original abilities.
 const retainedCatalogueTarget=(kind:'skill'|'soul-base',id:string,ownerId:string,source?:string)=>{
   if(!source||!retainedLabels?.has(kind+':'+id))return false;
   const record=after.战斗单位?.列表?.[ownerId]?.扩展?.持久人物;
   return record?.characterId===source&&record.generated?.[kind==='skill'?'skillIds':'soulIds']?.includes(id)===true;
 };
 const playerId=after.角色?.主控单位ID;
 // Background tournament entrants already have frozen combat mechanics. Their
 // personal prose belongs to their first actual encounter, not another match's settlement.
 const competitionIds=new Set<string>();
 for(const state of [before,after])for(const participant of state.比赛?.当前?.participants??[]){
  const characterId=participant.characterId??participant.temporaryRecord?.id;
  if(characterId)competitionIds.add(rules.arena.persistentCharacterId(characterId));
 }
 const competitionPerson=(person:any)=>competitionIds.has(person?.id)||person?.generatedBy==='competition-encounter'&&!!person.扩展?.赛事人物;
 const firstCompetitionEncounter=new Set<string>(),unmetCompetitionPeople=new Set<string>();
 for(const person of Object.values(after.人物?.列表??{}) as any[]){
  if(repair.has(person.id))continue;
  if(!person.扩展?.相遇记录?.[playerId]){if(competitionPerson(person))unmetCompetitionPeople.add(person.id);}
  else if((competitionPerson(person)||person.扩展?.角色库ID)&&!before.人物?.列表?.[person.id]?.扩展?.相遇记录?.[playerId])firstCompetitionEncounter.add(person.id);
 }
 for(const person of Object.values(after.人物?.列表??{}) as any[]){
  if(unmetCompetitionPeople.has(person.id))continue;
  const previous=before.人物?.列表?.[person.id];
  const promoted=previous?.tier==='light'&&person.tier==='full'&&!person.扩展?.npcLoadoutId&&(previous.扩展?.characterProfile?.status!=='complete'||rules.world.NPC_ARCHETYPES[person.扩展?.archetypeId]?.full);
  if((!previous||promoted||repair.has(person.id))&&person.id!==playerId&&(person.扩展?.archetypeId||repair.has(person.id)&&!person.扩展?.角色库ID)&&(promoted||person.扩展?.characterProfile?.status!=='complete')){
   const allowPersonalName=repair.has(person.id)&&!person.扩展?.角色库ID&&/掌柜|店主|商人|伙计/.test(person.name)&&/商|店|掌柜/.test(person.occupation??person.identity??'');
   result.push({kind:'person',id:person.id,allowPersonalName,fingerprint:generationFingerprint({name:person.name,age:person.age,gender:person.gender,occupation:person.occupation,faction:person.faction,profile:person.扩展?.characterProfile?.data}),value:person});
  }
 }
 for(const skill of Object.values(after.技能?.列表??{}) as any[]){
  const ownerId=skill.持有者单位ID;
  if(unmetCompetitionPeople.has(ownerId))continue;
  const item=after.物品?.实例?.[skill.sourceItemId??skill.扩展?.来源物品ID];
  const fixedItem=rules.world.isCanonicalSoulBone(item)||(item&&rules.world.ITEM_TEMPLATES[item.templateId]?.activeSkill&&!item.payload?.activeSkill&&!item.payload?.activeSkills);
  if((!before.技能?.列表?.[skill.id]||repair.has(ownerId)||firstCompetitionEncounter.has(ownerId))&&(!hasGeneratedName(skill)||(skill.namingSource==='preset'&&retainedCatalogueTarget('skill',skill.id,ownerId,skill.扩展?.catalogueNamingSource)))&&!fixedItem&&(skill.effectGraph||skill.效果图||skill.effectSpecs)){
   // A previously signed reply may already contain a paid label for this exact skill.
   if(!retainedLabels?.has('skill:'+skill.id)&&hasSettledWorkshopName(after,skill,item))continue;
   result.push({kind:'skill',id:skill.id,ownerId,fingerprint:generationFingerprint(skill),value:skill});
  }
 }
 for(const soul of Object.values(after.武魂?.列表??{}) as any[]){
  if(unmetCompetitionPeople.has(soul.持有者单位ID))continue;
  const compiled=soul.扩展?.结构化武魂,base=compiled?.baseAction;
  if(base&&(!before.武魂?.列表?.[soul.id]||repair.has(soul.持有者单位ID)||firstCompetitionEncounter.has(soul.持有者单位ID))&&(!soul.扩展?.baseActionNaming||(soul.扩展.baseActionNaming.source==='preset'&&retainedCatalogueTarget('soul-base',soul.id,soul.持有者单位ID,soul.扩展.baseActionNaming.recordId)))){result.push({kind:'soul-base',id:soul.id,ownerId:soul.持有者单位ID,fingerprint:generationFingerprint(base),value:{...base,soulName:soul.名称}});}
 }
 return result;
}

export function validateGenerationLabels(targets:GenerationTarget[],input:unknown):GenerationLabel[]{
 if(!Array.isArray(input)||input.length!==targets.length)throw Error('人物或能力生成结果不完整');
 const seen=new Set<string>(),names=new Set<string>();
 return input.map((row:any)=>{
  if(!row||Object.keys(row).some(k=>!['kind','id','fingerprint','name','description','profile','profileSource'].includes(k)))throw Error('生成结果包含不支持的字段');
  const target=targets.find(t=>t.id===row.id&&t.kind===row.kind),key=`${row.kind}:${row.id}`;
  if(!target||seen.has(key)||row.fingerprint!==target.fingerprint)throw Error('生成结果与冻结人物或能力不一致');seen.add(key);
  if(row.kind==='person'){
   if(row.description!==undefined||row.name!==undefined&&(!target.allowPersonalName||typeof row.name!=='string'||!/^\p{Script=Han}{2,5}$/u.test(row.name)||/掌柜|店主|商人|伙计/.test(row.name)))throw Error('人物身份不能通过命名结果改写');
   if(target.allowPersonalName&&!row.name)throw Error('商人需要个人姓名');
   if(row.profileSource==='existing'){
    if(row.profile!==undefined||row.name!==undefined||target.value.扩展?.characterProfile?.status!=='complete')throw Error('没有可保留的完成人物档案');
    return row;
   }
   const profile=validateCharacterProfile(row.profile);
   if(row.profileSource!==undefined&&(row.profileSource!=='preset'||row.name!==undefined||generationFingerprint(profile)!==generationFingerprint(target.value.扩展?.characterProfile?.data)))throw Error('本地短卡与创建时的人物资料不一致');
   profile.examples??=rules.npcLoadouts.examplesForProfile(profile);
   return {...row,profile};
  }
  if(row.profile!==undefined||row.profileSource!==undefined||typeof row.name!=='string'||row.name.trim().length<2||row.name.length>18||typeof row.description!=='string'||row.description.trim().length<8||row.description.length>globalThis.SoulSkillProse.descriptionLimit||/程序组合|魂师能力|第\d+魂技|本能运用/.test(row.name))throw Error('能力名称或介绍尚未完成');
  if(target.value.effectGraph)rules.effects.validateDefenseNarrative(target.value.effectGraph.nodes,row.description,target.value.effectGraph);
  const nameKey=`${target.ownerId}:${row.name.trim()}`;if(names.has(nameKey))throw Error('同一人物的能力名称不能重复');names.add(nameKey);
  return {...row,name:row.name.trim(),description:row.description.trim()};
 });
}

export function applyGenerationLabels(state:any,targets:GenerationTarget[],input:unknown){
 const labels=validateGenerationLabels(targets,input);
 for(const row of labels){
  if(row.kind==='person'){
   if(row.profileSource==='existing')continue;
   const person=state.人物.列表[row.id];person.扩展??={};person.扩展.characterProfile={version:1,source:row.profileSource??'llm',status:'complete',data:row.profile};
   if(row.name){if(Object.values(state.人物.列表).some((p:any)=>p.id!==row.id&&p.name===row.name))throw Error('个人姓名与已有人物重复');person.扩展.previousTitleName=person.name;person.name=row.name;const unit=state.战斗单位?.列表?.[row.id];if(unit)unit.名称=row.name;}
  }else if(row.kind==='skill'){
   const skill=state.技能.列表[row.id];if(generationFingerprint(skill)!==row.fingerprint)throw Error('魂技机制已经改变');
   const item=state.物品?.实例?.[skill.sourceItemId??skill.扩展?.来源物品ID],index=(skill.扩展?.技能序号??1)-1;
   const narrative={name:row.name,description:row.description,namingSource:'llm-frozen-mechanics-narrative',generationNaming:{source:'llm',fingerprint:row.fingerprint}};
   if(item?.type==='魂骨')rules.world.applySoulBoneSkillNarrative(item,index,narrative);
   skill.name=row.name;skill.名称=row.name;skill.description=row.description;skill.namingSource='llm-frozen-mechanics-narrative';
   skill.扩展??={};Object.assign(skill.扩展,{描述:row.description,命名来源:'llm-frozen-mechanics-narrative',generationNaming:{source:'llm',fingerprint:row.fingerprint}});
   const blueprint=item?.payload?.activeSkills?.[index]??item?.payload?.activeSkill;
   if(blueprint&&item.type!=='魂骨')Object.assign(blueprint,narrative);
  }else{
   const soul=state.武魂.列表[row.id],base=soul.扩展.结构化武魂.baseAction;if(generationFingerprint(base)!==row.fingerprint)throw Error('武魂本能机制已经改变');
   Object.assign(base,{name:row.name,description:row.description});soul.扩展.专属基础动作=structuredClone(base);soul.扩展.baseActionNaming={source:'llm',fingerprint:row.fingerprint};
   const unit=state.战斗单位?.列表?.[soul.持有者单位ID];
   if(unit&&rules.foundation.activeMartialSoulId(state,unit.id)===soul.id)state.战斗单位.列表[unit.id]=rules.foundation.applyMartialSoulCombatModifiers(unit,soul);
  }
 }
 return state;
}

/** Derived from the source command and its actual receipts; never stored as game state. */
export interface ExplicitGenerationSoulSource {personId:string;seed:string;kind:'template'|'preset'|'custom';sourceId:string;compiled:any}
const sourceEqual=(a:any,b:any):boolean=>a===b||!!a&&!!b&&typeof a==='object'&&typeof b==='object'&&Array.isArray(a)===Array.isArray(b)&&Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>Object.hasOwn(b,k)&&sourceEqual(a[k],b[k]));
function explicitSoulRequest(request:any){
 const template=typeof request?.martialSoulTemplateId==='string'&&request.martialSoulTemplateId.length?request.martialSoulTemplateId:null;
 const preset=typeof request?.presetId==='string'&&request.presetId.length?request.presetId:null;
 const custom=request?.martialSoulDraft&&typeof request.martialSoulDraft==='object'?request.martialSoulDraft:null;
 if([template,preset,custom].filter(Boolean).length>1)throw Error('人物的武魂来源不能同时选择范本、精品和自定义草案');
 return template?{kind:'template' as const,value:template}:preset?{kind:'preset' as const,value:preset}:custom?{kind:'custom' as const,value:custom}:null;
}
export function explicitGenerationSoulSources(before:any,after:any,command:any,receipt?:any):ExplicitGenerationSoulSource[]{
 const requests:{personId:string;request:any}[]=[];
 if(command.type==='story.execute'){
  const turn=after.扩展?.story?.active,segments=command.payload?.plan?.segments;
  if(!turn||!Array.isArray(segments)||command.payload.branchId!==after.扩展.story.branchId||command.payload.turn!==turn.number)throw Error('这次人物创建已不在原来的故事回合，请重新确认。');
  for(const r of turn.results??[]){
   if(r.status!=='succeeded'||r.action?.kind!=='introduce-person'||r.receipt?.reused)continue;
   if(!Number.isSafeInteger(r.step)||r.step<0||r.step>=segments.length||segments[r.step]?.action?.kind!=='introduce-person'||r.source!==segments[r.step].source||r.receipt?.type!=='story-person-created')throw Error('无法确认这位新人物的来历，请重新创建。');
   const request=segments[r.step].action;if(!explicitSoulRequest(request))continue;
   const person=after.人物?.列表?.[r.receipt.personId];
   if(!person||before.人物?.列表?.[person.id]||person.扩展?.故事来源?.sourceId!==r.receipt.sourceId)throw Error('无法确认这位新人物的武魂，请重新创建。');
   for(const key of ['martialSoulTemplateId','presetId','martialSoulDraft'])if(!sourceEqual(request[key],r.action[key]))throw Error('新人物的武魂与先前选择不一致。');
   requests.push({personId:person.id,request});
  }
 }else if(command.type==='world.intent'&&['spawn-npc','promote-npc'].includes(command.payload?.type)&&explicitSoulRequest(command.payload)){
  const type=command.payload.type==='spawn-npc'?'npc-spawned':'npc-promoted',person=after.人物?.列表?.[receipt?.personId];
  if(receipt?.type!==type||!person||command.payload.id&&command.payload.id!==person.id||command.payload.type==='promote-npc'&&command.payload.personId!==person.id)throw Error('无法确认这位人物的武魂，请重新创建。');
  const prior=before.人物?.列表?.[person.id];
  if(!prior||prior.tier==='light'&&person.tier==='full'||!before.战斗单位?.列表?.[person.id]&&after.战斗单位?.列表?.[person.id])requests.push({personId:person.id,request:command.payload});
 }
 const seen=new Set<string>();return requests.map(({personId,request})=>{
  if(seen.has(personId))throw Error('这位人物重复选择了武魂，请重新确认。');seen.add(personId);
  const person=after.人物.列表[personId],source=explicitSoulRequest(request)!,budget=rules.world.npcMartialSoulBudget(person.扩展?.archetypeId);let compiled:any,sourceId:string;
  if(source.kind==='template'){
   const template=rules.world.MARTIAL_SOUL_TEMPLATES[source.value];compiled=template?.结构化武魂;if(!compiled||compiled.pricing.total>budget)throw Error('指定武魂范本不在该人物预算内');sourceId=source.value;
  }else if(source.kind==='preset'){
   const quote=rules.presets.compile(source.value,{budget});if(!quote.pass||quote.category!=='武魂')throw Error(quote.reason||'指定精品武魂不符合该人物条件');compiled=quote.mechanics;sourceId=quote.presetId;
  }else {compiled=rules.martialSoul.finalizeDraft(source.value,{budget});sourceId=compiled.definition.draftId;}
  return {personId,seed:person.seed,kind:source.kind,sourceId,compiled};
 });
}
function pinnedSoulMechanics(compiled:any){
 rules.martialSoul.normalizeCompiledAttributes(compiled);
 const base=structuredClone(compiled.baseAction);if(!rules.abilities.verify(base).pass)throw Error('武魂本能尚未配置完整，请重新确认。');
 for(const key of ['name','description','名称','描述'])delete base[key];
 return {...Object.fromEntries(['name','version','attributeVersion','quality','pricing','definition','exchangeContracts','categories','attributes','channels','traits','weaknesses','semanticTags','allowedEffectIds','mechanicalHooks'].map(key=>[key,compiled[key]])),baseAction:base};
}
export function assertExplicitGenerationSoulSources(before:any,after:any,command:any,receipt?:any):ExplicitGenerationSoulSource[]{
 const sources=explicitGenerationSoulSources(before,after,command,receipt);
 for(const source of sources){
  const person=after.人物.列表[source.personId],owned=(Object.values(after.武魂?.列表??{}) as any[]).filter(s=>s.持有者单位ID===source.personId),ids=after.成长?.列表?.[source.personId]?.武魂ID列表;
  if(owned.length!==1||!Array.isArray(ids)||ids.length!==1||ids[0]!==owned[0].id)throw Error('新人物的武魂与先前选择不一致。');
  const soul=owned[0],compiled=soul.扩展?.结构化武魂??soul.结构化武魂;
  if(source.kind==='template'&&soul.扩展?.templateId!==source.sourceId||source.kind==='preset'&&(person.扩展?.presetSoulId!==source.sourceId||compiled?.definition?.presetId!==source.sourceId)||source.kind==='custom'&&soul.扩展?.generatedBy!=='npc-custom-creation')throw Error('新人物改换了先前选定的武魂，请重新确认。');
  const expected=pinnedSoulMechanics(source.compiled),actual=pinnedSoulMechanics(compiled);
  if(!sourceEqual(expected,actual)||rules.abilities.hash(expected)!==rules.abilities.hash(actual))throw Error('新人物的武魂能力、代价或预算与先前选择不一致。');
 }
 return sources;
}
