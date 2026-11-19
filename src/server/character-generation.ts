import {createHash,randomUUID} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {join} from 'node:path';
import {GameEngine} from '../runtime/engine';
import type {GameCommand,GameSnapshot} from '../runtime/contracts';
import {generationTargets,validateGenerationLabels,assertExplicitGenerationSoulSources,type GenerationTarget,type GenerationLabel} from '../runtime/generation-completion';
import {abilityWritingMeaning} from '../runtime/ability-writing';
import {soulWritingContext} from '../runtime/creative-context';
import {requestMartialSoulDraft} from '../runtime/game-model-orchestrator';
import {creativeMessages} from '../runtime/model-prompts';
import {ModelGatewayError,type ModelGateway} from '../runtime/model-gateway';
import {rules} from '../rules';
import {validateCommand} from './input';
import {issueWorkflowTicket,stateFingerprint,supportsWorkflowCommand} from './workflow-ticket';
import {defaultModelRecoveryDirectory} from './model-recovery-store';
import {commandCannotGenerate} from '../runtime/story-generation-capabilities';

const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function generationCommand(snapshot:GameSnapshot,type:string,payload:Record<string,any>,commandId?:string):GameCommand {
 const command=validateCommand({id:commandId??`generation:${digest([stateFingerprint(snapshot),type,payload])}`,type,payload,expectedRevision:snapshot.revision});
 return command;
}
export function projectGeneration(snapshot:GameSnapshot,command:GameCommand,npcDrafts:Record<string,any>={}){
 const source=structuredClone(snapshot);
 (source.state as any).扩展.npcCreationDrafts=structuredClone(npcDrafts);const engine=new GameEngine('',source);
 const result=engine.dispatch(command);delete (result.snapshot.state as any).扩展.npcCreationDrafts;assertExplicitGenerationSoulSources(snapshot.state,result.snapshot.state,command,result.events[0]?.payload);return result;
}
export function previewGeneration(snapshot:GameSnapshot,type:string,payload:Record<string,any>){
 const command=generationCommand(snapshot,type,payload),after=projectGeneration(snapshot,command);
 const targets=generationTargets(snapshot.state,after.snapshot.state);
 return {needed:!!targets.length,commandId:command.id,people:targets.filter(t=>t.kind==='person').length,abilities:targets.filter(t=>t.kind!=='person').length};
}

interface CreationProgress {version:1;drafts:Record<string,any>;labels:GenerationLabel[]}
/** Only validated generated output; no connection, credentials or full save is persisted. */
function creationProgress(scope:string,persist:boolean){
 const directory=join(defaultModelRecoveryDirectory(),'character-generation'),path=join(directory,scope+'.json');
 const data:CreationProgress=persist&&existsSync(path)?JSON.parse(readFileSync(path,'utf8')):{version:1,drafts:{},labels:[]};
 if(data.version!==1||!data.drafts||!Array.isArray(data.labels))throw Error('人物创建检查点无效');
 return {data,save(){if(!persist)return;mkdirSync(directory,{recursive:true});const temporary=path+'.'+randomUUID()+'.tmp';writeFileSync(temporary,JSON.stringify(data),'utf8');renameSync(temporary,path);}};
}

export async function completeGeneratedCommand(snapshot:GameSnapshot,worldId:string,command:GameCommand,gateway:ModelGateway,secret:string,signal:AbortSignal,options:{persist?:boolean;repairIds?:string[];preserveCommandIdentity?:boolean}={}){
 if(['generation.apply','workflow.apply'].includes(command.type))throw Error('生成操作不能嵌套');
 const repairIds=options.repairIds??[];
 if(!Array.isArray(repairIds)||repairIds.length>12||repairIds.some(id=>typeof id!=='string'||!(snapshot.state as any).人物?.列表?.[id]))throw Error('请选择需要补充资料的人物。');
 const departurePlan=command.type==='story.resume'?(snapshot.state as any).扩展?.story?.active?.continuation?.plan:command.payload.plan;
 const departureIdentity=['story.execute','story.resume','story.supplement'].includes(command.type)&&departurePlan?.segments?.some((segment:any)=>segment.action?.kind==='start-expedition');
 const direct=()=>({ticket:issueWorkflowTicket(secret,worldId,snapshot,!options.preserveCommandIdentity&&!departureIdentity&&supportsWorkflowCommand(command.type)?{type:command.type,payload:command.payload}:{type:'generation.apply',payload:{command,labels:[],npcDrafts:{},...(repairIds.length?{repairIds}:{})}}),value:{completed:0}});
 if(!repairIds.length&&commandCannotGenerate(command,snapshot.state))return direct();
 const preliminary=projectGeneration(snapshot,command),initial=generationTargets(snapshot.state,preliminary.snapshot.state,repairIds);
 // Only a pending original command needs the generation envelope to retain its
 // payment/seed/replay identity. A checked narrative result can commit directly.
 if(!initial.length)return direct();
 const pinned=assertExplicitGenerationSoulSources(snapshot.state,preliminary.snapshot.state,command,preliminary.events[0]?.payload);
 const sourceScope=pinned.map(source=>({personId:source.personId,kind:source.kind,sourceId:source.sourceId,fingerprint:rules.abilities.hash(source.compiled)}));
 const progress=creationProgress(digest([worldId,stateFingerprint(snapshot),command,repairIds,...(sourceScope.length?[{explicitNpcSoulSource:1,sources:sourceScope}]:[])]),options.persist??true),defaultDraftBudgets=new Map<string,number>();
 const npcDrafts=()=>Object.fromEntries(Object.entries(progress.data.drafts).filter(([seed,draft])=>{const budget=defaultDraftBudgets.get(seed);if(budget===undefined)return false;rules.martialSoul.finalizeDraft(draft,{budget});return true;})); // Keep old transient files and maps, but use only this command's actual eligible default targets.
 // The ordinary creator and the host creator share this exact soul generation path.
 for(const target of initial.filter(t=>t.kind==='person')){
  const person=target.value,a=rules.world.NPC_ARCHETYPES[person.扩展.archetypeId];
  // Only world creation/promotion consumes npcCreationDrafts. Fixed tournament
  // and canonical loadouts must never be sent back through soul design.
  if(!a?.full||person.扩展?.creationBudget?.version!==1||repairIds.includes(person.id)&&command.type!=='generation.rebuild-service'||person.扩展?.deferredNpc||pinned.some(source=>source.personId===person.id))continue;
  const soul=(Object.values((preliminary.snapshot.state as any).武魂.列表) as any[]).find(s=>s.持有者单位ID===person.id);
  if(!soul||soul.扩展?.generatedBy==='npc-custom-creation')continue;
  const budget=rules.world.npcMartialSoulBudget(person.扩展.archetypeId),cached=progress.data.drafts[person.seed];defaultDraftBudgets.set(person.seed,budget);
  if(cached){rules.martialSoul.finalizeDraft(cached,{budget});rules.npcLoadouts.assertOrdinarySoul(cached);continue;}
  const designBudget=rules.world.npcMartialSoulDesignBudget(person.扩展.archetypeId);
  const description=`为${person.name}创建武魂。${person.gender}，${person.age}岁，${person.identity}，职业${person.occupation}，${(preliminary.snapshot.state as any).成长.列表[person.id]?.魂力等级??0}级，归属${person.faction}，性格${person.personality}。${a.creationGuidance??''}。已有个人经历与目标：${JSON.stringify(person.扩展?.characterProfile?.data??{})}。这是尚未创建武魂的新人物，由你决定预算内的全部取舍，不需要向玩家追问。结合职业设计独立形象和机制；可采用原著常见武魂类型，不采用特殊传承或专属来源。先满足职业所需的基本用途，额外机制和特性可由你自行舍弃，不必用满预算，在${designBudget}点内直接给完整可采用提案。`;
  const draft=(await requestMartialSoulDraft(gateway,description,{budget:designBudget,draftId:`npc-soul:${command.id}:${person.id}`,signal})).draft;rules.npcLoadouts.assertOrdinarySoul(draft);progress.data.drafts[person.seed]=draft;progress.save();
 }
 const projected=projectGeneration(snapshot,command,npcDrafts()),state:any=projected.snapshot.state;
 const targets=generationTargets(snapshot.state,state,repairIds),labels:GenerationLabel[]=[];
 const labeled=(target:GenerationTarget)=>labels.some(row=>row.kind===target.kind&&row.id===target.id);
 const reservedNames:Record<string,{kind:string;id:string;name:string}[]>={};
 const reserve=(ownerId:string,kind:string,id:string,name:string)=>{if(name&&!targets.some(t=>t.kind===kind&&t.id===id))(reservedNames[ownerId]??=[]).push({kind,id,name});};
 for(const skill of Object.values(state.技能?.列表??{}) as any[])reserve(skill.持有者单位ID,'skill',skill.id,skill.name??skill.名称??'');
 for(const soul of Object.values(state.武魂?.列表??{}) as any[])reserve(soul.持有者单位ID,'soul-base',soul.id,soul.扩展?.结构化武魂?.baseAction?.name??'');
 const validateBatch=(batch:GenerationTarget[],rows:unknown)=>{
  if(!Array.isArray(rows))throw Error('生成结果须包含本批全部条目');
  const existing=targets.filter(t=>labeled(t)),checked=validateGenerationLabels([...existing,...batch],[...labels,...rows]);
  for(const row of checked)if(row.kind!=='person'&&(reservedNames[targets.find(t=>t.kind===row.kind&&t.id===row.id)?.ownerId??'']??[]).some(other=>other.name===row.name))throw Error('同一人物的能力名称不能重复');
  for(const row of checked)if(row.kind==='person'&&row.name){if(Object.values(state.人物.列表).some((person:any)=>person.id!==row.id&&person.name===row.name)||checked.some(other=>other.kind==='person'&&other.id!==row.id&&other.name===row.name))throw Error('个人姓名与已有人物重复');}
  return checked.filter(row=>batch.some(t=>t.kind===row.kind&&t.id===row.id));
 };
 for(const target of targets){const cached=progress.data.labels.find(row=>row.kind===target.kind&&row.id===target.id&&row.fingerprint===target.fingerprint);if(cached){try{labels.push(...validateBatch([target],[cached]));}catch{progress.data.labels=progress.data.labels.filter(row=>row!==cached);progress.save();}}}
 const abilityPacket=(batch:GenerationTarget[],task:'character-profile'|'ability-narrative')=>{
  const owners=new Map<string,unknown>(),souls=new Map<string,unknown>();
  const ownerIds=new Set(batch.map(t=>t.ownerId??''));
  const comparison=[...ownerIds].flatMap(ownerId=>(reservedNames[ownerId]??[]).map(row=>({...row,ownerId})));
  for(const row of labels){
   if(row.kind==='person'||!row.name)continue;
   const ownerId=targets.find(t=>t.kind===row.kind&&t.id===row.id)?.ownerId??'';
   if(ownerIds.has(ownerId))comparison.push({kind:row.kind,id:row.id,name:row.name,ownerId});
  }
  const abilities=batch.map(target=>{
   const owner=state.人物?.列表?.[target.ownerId??''];
   const soulId=target.kind==='soul-base'?target.id:target.value.来源武魂ID,soul=state.武魂?.列表?.[soulId];
   if(owner&&!owners.has(owner.id)){
    const profile=labels.find(r=>r.kind==='person'&&r.id===owner.id)?.profile??owner.扩展?.characterProfile?.data;
    owners.set(owner.id,{name:owner.name,occupation:owner.occupation,personality:owner.personality,profile});
   }
   if(soul&&!souls.has(soulId))souls.set(soulId,soulWritingContext(soul));
   return {kind:target.kind,id:target.id,fingerprint:target.fingerprint,ownerId:owner?.id??null,martialSoulId:soul?soulId:null,
    source:state.魂兽档案?.列表?.[target.value.来源魂兽档案ID]?.名称??target.value.sourceKind,previousName:target.value.扩展?.originalName||null,
    meaning:abilityWritingMeaning(target.value,target.kind==='soul-base'?'soul':target.value.类型==='魂骨技'?'bone':'soul')};
  });
  if(gateway.hasPromptOverride(task))return {comparison:comparison.map(({ownerId,...row})=>row),abilities:abilities.map(({ownerId,martialSoulId,...ability})=>({...ability,owner:owners.get(ownerId)??null,martialSoul:souls.get(martialSoulId)??null}))};
  return {abilities,ownersById:Object.fromEntries(owners),martialSoulsById:Object.fromEntries(souls),comparison};
 };
 const abilityResponse={kind:'对应kind',id:'对应id',fingerprint:'原样fingerprint',name:'正式技能名',description:'依据机制的自然介绍'};
 for(const target of targets.filter(t=>t.kind==='person'&&!labeled(t))){
  const person=target.value;
  if(person.扩展?.characterProfile?.status==='complete'&&!repairIds.includes(person.id)){
   labels.push(...validateBatch([target],[{kind:target.kind,id:target.id,fingerprint:target.fingerprint,profileSource:'existing'}]));
   continue;
  }
  const output=gateway.checkTaskSettings('character-profile').outputTokens??4096;
  const first=targets.filter(t=>t.kind!=='person'&&t.ownerId===person.id&&!labeled(t)).slice(0,Math.min(6,Math.max(0,Math.floor((output-2500)/500))));
  const messages=creativeMessages('character-profile',{person:{id:person.id,name:person.name,age:person.age,gender:person.gender,appearance:person.appearance,personality:person.personality,occupation:person.occupation,faction:person.faction,level:state.成长.列表[person.id]?.魂力等级??0},
   location:rules.world.LOCATION_TEMPLATES[person.locationId]?.name,existingProfile:person.扩展?.characterProfile?.data,positioning:rules.world.NPC_ARCHETYPES[person.扩展?.archetypeId]?.creationGuidance,
   souls:(Object.values(state.武魂.列表) as any[]).filter(s=>s.持有者单位ID===person.id).map(soulWritingContext),knownHistory:person.扩展?.共同经历??[],
   ...(target.allowPersonalName?{personalNameInstruction:'现有姓名是店铺职称。为此人提供2至5字中文个人姓名，保留店铺、职业及交易关联。'}:{}),
   ...(first.length?abilityPacket(first,'character-profile'):{}),
   response:{...(target.allowPersonalName?{name:'中文个人姓名'}:{}),profile:{biography:'人物小传',values:'价值取向与性格细节',speech:'表达习惯',shortTermGoal:'短期目标',longTermGoal:'长期目标',examples:[{prompt:'对方的话或动作',reply:'本人会怎样回应'}]},...(first.length?{abilities:[abilityResponse]}:{})}});
  const localProfile=(snapshot.state as any).人物?.列表?.[person.id]?undefined:person.扩展?.characterProfile?.data;
  let result:GenerationLabel[];
  try{
   result=await gateway.structured(messages,
    (value:any)=>validateBatch([target,...first],[{kind:target.kind,id:target.id,fingerprint:target.fingerprint,profile:value.profile,...(target.allowPersonalName?{name:value.name}:{})},...(first.length?Array.isArray(value.abilities)?value.abilities:[]:[])]),
    {task:'character-profile',signal,repairValidation:!localProfile,...(localProfile?{repairFormat:false}:{})});
  }catch(error){
   signal.throwIfAborted();
   if(!localProfile||!(error instanceof ModelGatewayError)||['cancelled','evaluation-limit','evaluation-ledger','model-recovery-record'].includes(error.kind))throw error;
   result=validateBatch([target],[{kind:target.kind,id:target.id,fingerprint:target.fingerprint,profile:localProfile,profileSource:'preset'}]);
  }
  labels.push(...result);progress.data.labels.push(...result);progress.save();
 }
 const missing=targets.filter(t=>t.kind!=='person'&&!labeled(t));
 for(let offset=0;offset<missing.length;offset+=6){
  const batch=missing.slice(offset,offset+6);
  const result=await gateway.structured(creativeMessages('ability-narrative',{...abilityPacket(batch,'ability-narrative'),response:{abilities:[abilityResponse]}}),
   (value:any)=>validateBatch(batch,value.abilities),{task:'ability-narrative',signal,repairValidation:true});
  labels.push(...result);progress.data.labels.push(...result);progress.save();
 }
 validateGenerationLabels(targets,labels);signal.throwIfAborted();
 return {ticket:issueWorkflowTicket(secret,worldId,snapshot,{type:'generation.apply',payload:{command,labels,npcDrafts:npcDrafts(),...(repairIds.length?{repairIds}:{})}}),value:{completed:targets.length,people:targets.filter(t=>t.kind==='person').map(t=>t.id),abilities:targets.filter(t=>t.kind!=='person').map(t=>t.id)}};
}
