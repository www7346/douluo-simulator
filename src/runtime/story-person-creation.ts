import {storyPersonReferences,storyNameKey} from './story-person-names';
import {rules} from '../rules';
import {meetStoryPerson} from './story-people';
import {storyObjectRecord,storyObjectKnownDetails} from './story-objects';
import {validateCharacterProfile} from './character-profile';
import {assignGenericHumanArt} from '../shared/generic-human-art';

const presetSoulOptions=rules.presets.list({category:'武魂'}).map((entry:any)=>({id:entry.id,name:entry.name,quote:rules.presets.compile(entry.id,{budget:Number.MAX_SAFE_INTEGER})})).filter((entry:any)=>entry.quote.pass&&rules.npcLoadouts.ordinarySoul(entry));
export function storyPersonCreationOptions(preference?:string){
 const genderPreference=preference==='male'?'未指定性别的自动生成角色为男。':preference==='female'?'未指定性别的自动生成角色为女。':'';
 return Object.entries(rules.world.NPC_ARCHETYPES).map(([id,a]:[string,any])=>({id,identity:a.identity,occupation:a.occupation,full:a.full,...(a.creationGuidance?{creationGuidance:a.creationGuidance}:{}),profileFields:['biography','values','speech','shortTermGoal','longTermGoal'],budget:rules.world.npcCreationBudget(id),customSoulBudget:rules.world.npcMartialSoulDesignBudget(id),generationPolicy:'新人物按定位实时创建武魂与魂环能力；不指定范本时交给人物生成器，普通人物不采用专属传承或跨时代来源。'+genderPreference,presetSouls:a.full?presetSoulOptions.filter((entry:any)=>entry.quote.value<=rules.world.npcMartialSoulBudget(id)).map((entry:any)=>({id:entry.id,name:entry.name,value:entry.quote.value})):[],levels:a.full?a.level:null,escort:a.escort?{...a.escort}:null,martialSouls:a.full?(a.martialSouls??[]).filter((id:string)=>rules.npcLoadouts.ordinarySoul(rules.world.MARTIAL_SOUL_TEMPLATES[id])).map((id:string)=>({id,name:rules.world.MARTIAL_SOUL_TEMPLATES[id]?.名称??id})):[]}));
}
export function validateStoryPersonCreation(input:Record<string,any>){
 const allowed=['kind','objectId','objectStep','identity','occupation','archetypeId','name','age','gender','appearance','personality','profile','level','martialSoulTemplateId','martialSoulDescription','martialSoulDraft','presetId'];
 if(input.profile!==undefined)validateCharacterProfile(input.profile);
 if(Object.keys(input).some(key=>!allowed.includes(key)))throw Error('人物创建包含未开放的字段');
 if(!Object.hasOwn(rules.world.NPC_ARCHETYPES,input.archetypeId))throw Error('人物定位不在已接入的创建原型中');
 for(const key of ['identity','occupation'])if(input[key]!==undefined&&(typeof input[key]!=='string'||!input[key].trim()||input[key].length>40))throw Error('人物身份与职业须为1至40字');
 const archetype=rules.world.NPC_ARCHETYPES[input.archetypeId];
 if(!archetype)throw Error('人物定位不在已接入的创建原型中');
 const linked=input.objectId!==undefined||input.objectStep!==undefined;
 if(input.objectId!==undefined&&(typeof input.objectId!=='string'||!input.objectId||input.objectId.length>200))throw Error('叙事人物关联无效');
 if(input.objectStep!==undefined&&(!Number.isSafeInteger(input.objectStep)||input.objectStep<0||input.objectStep>11||input.objectId!==undefined))throw Error('叙事人物步骤无效');
 for(const key of ['name','gender','appearance','personality']){if(linked&&key!=='name'&&input[key]===undefined)continue;if(typeof input[key]!=='string'||!input[key].trim()||input[key].length>(key==='name'?40:160))throw Error('人物姓名、性别、外貌和性格须明确填写');}
 if(!(linked&&input.age===undefined)&&(!Number.isSafeInteger(input.age)||input.age<1||input.age>150))throw Error('人物年龄超出当前创建范围');
 if(archetype.full){
  if(!(linked&&input.level===undefined)&&(!Number.isSafeInteger(input.level)||input.level<archetype.level[0]||input.level>archetype.level[1]))throw Error('人物等级超出所选定位范围');
  if(input.presetId!==undefined){
   if(typeof input.presetId!=='string'||!input.presetId||(input.martialSoulTemplateId!==undefined&&input.martialSoulTemplateId!=='')||input.martialSoulDescription!==undefined||input.martialSoulDraft!==undefined)throw Error('精品武魂须独立选择，不能同时指定模板或自定义构想');
   const entry=rules.presets.get(input.presetId);
   if(entry)rules.npcLoadouts.assertOrdinarySoul(entry);
   const preset=rules.presets.compile(input.presetId,{budget:rules.world.npcMartialSoulBudget(input.archetypeId)});
   if(!preset.pass||preset.category!=='武魂')throw Error(preset.reason||'武魂须是定位预算内的登记精品');
  }else if(input.martialSoulDescription!==undefined){
   if(typeof input.martialSoulDescription!=='string'||!input.martialSoulDescription.trim()||input.martialSoulDescription.length>600)throw Error('自定义武魂构想须为1至600字');
   if(input.martialSoulTemplateId!==''&&!(linked&&input.martialSoulTemplateId===undefined))throw Error('自定义武魂不能同时选择模板');
   if(input.martialSoulDraft!==undefined)rules.martialSoul.finalizeDraft(input.martialSoulDraft,{budget:rules.world.npcMartialSoulBudget(input.archetypeId)});
  }else if(input.martialSoulDraft!==undefined||input.martialSoulTemplateId!==undefined&&input.martialSoulTemplateId!==''&&(!rules.world.MARTIAL_SOUL_TEMPLATES[input.martialSoulTemplateId]||rules.world.MARTIAL_SOUL_TEMPLATES[input.martialSoulTemplateId].结构化武魂.pricing.total>rules.world.npcMartialSoulBudget(input.archetypeId)))throw Error('武魂须是定位预算内的登记模板，或填写自定义武魂构想');
  const source=input.presetId?rules.presets.get(input.presetId):input.martialSoulDraft??rules.world.MARTIAL_SOUL_TEMPLATES[input.martialSoulTemplateId];
  if(source)rules.npcLoadouts.assertOrdinarySoul(source);
 }else if((input.level!==0&&!(linked&&input.level===undefined))||(input.martialSoulTemplateId!==''&&!(linked&&input.martialSoulTemplateId===undefined))||input.martialSoulDescription!==undefined||input.martialSoulDraft!==undefined||input.presetId!==undefined)throw Error('轻量人物不能凭空拥有等级与武魂');
}
export function introduceStoryPerson(state:any,input:Record<string,any>,sourceId:string){
 validateStoryPersonCreation(input);
 if(input.objectStep!==undefined)throw Error('叙事人物步骤尚未解析');
 const object=input.objectId?storyObjectRecord(state,input.objectId,'person'):undefined;
 if(object?.entityId){
  const met=meetStoryPerson(state,object.entityId);
  return {state:met.state,receipt:{...met.receipt,type:'story-person-created',sourceId,personId:object.entityId,objectId:object.id,reused:true,summary:'已找到原来的人物，身份、能力和经历保持不变。'}};
 }
 if(object){
  const known=storyObjectKnownDetails(object);
  for(const [field,value] of Object.entries(known))if(input[field]!==undefined&&input[field]!==value)throw Error(`正式人物的${field}与已确定原文不一致`);
  input={...input,...known};
 }
 if(input.martialSoulDescription!==undefined&&input.martialSoulDraft===undefined)throw Error('自定义武魂尚未完成生成与校验，不能登记人物');
 const block=rules.world.worldActionBlockReason(state);if(block)throw Error(block);
 if(state.远征?.当前&&!['completed','failed','extracted'].includes(state.远征.当前.status))throw Error('副本人物须由房间规则生成');
 if(!state.角色?.主控单位ID)throw Error('请先创建角色');
 const name=input.name.trim(),nameKey=(value:string)=>value.normalize('NFKC').replace(/\s/g,'');
 const key=nameKey(name);
 if((Object.values(state.人物?.列表??{}) as any[]).some(p=>nameKey(p.name)===key)||(Object.values(rules.arena.CHARACTER_CATALOG) as any[]).some(p=>[p.name,p.name.split('·')[0]].some(n=>nameKey(n)===key)))throw Error('已有同名人物，请读取原档案或澄清身份，不能重新创建');
 if(storyPersonReferences(state).some(r=>storyNameKey(r.name)===key))throw Error('这个称呼已经指向已知人物，请读取称呼对应档案或澄清，不能重新创建');
 const otherObject=(state.扩展?.storyObjects??[]).find((r:any)=>r.type==='person'&&r.id!==object?.id&&r.mentions.some((m:any)=>[m.name,...m.aliases].some((n:string)=>nameKey(n)===key)));
 if(otherObject)throw Error('这个称呼已有叙事对象，请先沿用原对象正式化或澄清身份');
 const position=rules.actions.positionOf(state,state.角色.主控单位ID);if(position.kind!=='location'||position.sceneId)throw Error('当前仍在途中或独立房间，不能在地图落脚点生成人物');
 const id=`story-person:${sourceId}`;
 if(state.人物?.列表?.[id])throw Error('本次人物已创建，请读取原档案');
 const result=rules.world.spawnNpc(state,{...input,...(object?{deferDetails:true,deferredSourceId:sourceId}:{}),name,id,locationId:state.地图.当前地点ID,seed:`${state.世界.seed}:${sourceId}`,generatedBy:'story-introduction'},sourceId);
 const person=result.state.人物.列表[id];person.扩展.故事来源={sourceId,createdAt:structuredClone(result.state.世界.时间)};
 if(object){
  const linked=storyObjectRecord(result.state,object.id,'person');linked.entityId=id;
  person.扩展.storyObjectId=object.id;person.扩展.storyObjectBasis=storyObjectKnownDetails(linked);
  // Keep biography from its source; the same archetype resolves mechanics only when an operation needs them.
  if(input.age===undefined)person.age=null;
  for(const field of ['gender','appearance','personality'])if(input[field]===undefined&&(field!=='gender'||!['male','female'].includes(result.state.世界.npcGender)))person[field]='';
 }
 assignGenericHumanArt(result.state,result.state.人物.列表[id]);
 const met=meetStoryPerson(result.state,id);
 return {state:met.state,receipt:{...result.receipt,type:'story-person-created',sourceId,personId:id,...(object?{objectId:object.id,inheritedDetails:storyObjectKnownDetails(object)}:{}),archetypeId:input.archetypeId,level:result.state.成长.列表[id]?.魂力等级??null,martialSoulIds:result.state.成长.列表[id]?.武魂ID列表??[],summary:`已登记并遇见${name}，后续互动沿用此人物档案。`}};
}
