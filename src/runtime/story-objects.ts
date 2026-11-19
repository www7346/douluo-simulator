import {MAX_STORY_PROSE_LENGTH} from '../shared/story-prose';
import {modelShapeIssues} from '../shared/model-json-schema';
import {STORY_OBJECT_FROM_SCHEMA,STORY_OBJECT_DETAILS_SCHEMA,STORY_OBJECT_TEXT_SCHEMAS} from '../shared/story-object-contract';
import {StoryPlanValidationError,type StoryPlanValidationIssue} from './story-plan-validation-error';
/** Narrative references are not people, inventory, abilities or verified world facts. */
export interface StoryObjectEvidence {turn:number;field:'input'|'prose';start:number;end:number;quote:string;privatePersonId?:string;archiveId?:string;branchId?:string;revision?:number}
export interface StoryObjectDetail {field:'name'|'identity'|'occupation'|'appearance'|'gender'|'age'|'holder'|'owner';value:string|number;quote:string;basis:'observed'|'reported'}
export interface StoryObjectMention {
 name:string;aliases:string[];quote:string;reason:string;
 source:{id:string;branchId:string;turn:number;step:number;privatePersonId?:string};
 evidence?:StoryObjectEvidence;details?:StoryObjectDetail[];
 recordedAt:{day:number;hour:number;minute:number};locationId:string;
}
export interface StoryObjectRecord {id:string;type:'person'|'item';mentions:StoryObjectMention[];entityId?:string}
const key=(s:string)=>s.normalize('NFKC').replace(/\s/g,'');
const plain=(v:any)=>!!v&&typeof v==='object'&&!Array.isArray(v);
const fields=(v:any,allowed:string[])=>{if(!plain(v)||Object.keys(v).some(k=>!allowed.includes(k)))throw Error('叙事对象包含未开放字段');};
const text=(v:any,max:number)=>{if(typeof v!=='string'||!v.trim()||v!==v.trim()||v.length>max)throw Error('叙事对象文字缺失或过长');};
const records=(state:any):StoryObjectRecord[]=>state.扩展?.storyObjects??[];
const visible=(m:StoryObjectMention,personId?:string)=>!m.source.privatePersonId||m.source.privatePersonId===personId;

export function storyObjectActionIssues(action:any,path=''):StoryPlanValidationIssue[]{
 if(action?.kind!=='remember-object')return [];
 return [
  ...modelShapeIssues(action.objectType,{type:'string',enum:['person','item']},path+'/objectType'),
  ...Object.entries(STORY_OBJECT_TEXT_SCHEMAS).flatMap(([field,schema])=>modelShapeIssues(action[field],schema,path+'/'+field)),
  ...(action.from===undefined?[]:modelShapeIssues(action.from,STORY_OBJECT_FROM_SCHEMA,path+'/from')),
  ...(action.details===undefined?[]:modelShapeIssues(action.details,STORY_OBJECT_DETAILS_SCHEMA,path+'/details')),
 ];
}
export function validateStoryObjectAction(action:any,source:string){
 const issues=storyObjectActionIssues(action);
 if(issues.length)throw new StoryPlanValidationError('叙事对象资料格式不完整，请重试本次行动',issues[0],issues);
 if(action.kind==='resolve-object'){
  fields(action,['kind','name']);text(action.name,40);
  if(!source.includes(action.name))throw Error('对象称呼须取自玩家本次原话');
  return;
 }
 fields(action,['kind','objectId','objectType','name','aliases','quote','reason','from','evidence','details']);
 if(action.kind!=='remember-object'||!['person','item'].includes(action.objectType))throw Error('叙事对象类型无效');
 if(action.objectId!==undefined)text(action.objectId,200);
 text(action.name,40);text(action.quote,1000);text(action.reason,160);
 const aliases=action.aliases??[];
 if(action.aliases===null||!Array.isArray(aliases)||aliases.length>8||aliases.some((s:any)=>typeof s!=='string'))throw Error('叙事对象称呼列表须为最多8个字符串；没有其他称呼时省略或填空数组');
 const names=[action.name,...aliases];names.forEach(n=>text(n,40));
 if(new Set(names.map(key)).size!==names.length)throw Error('叙事对象称呼重复');
 if(action.from!==undefined){fields(action.from,['turn','field']);if(!Number.isSafeInteger(action.from.turn)||action.from.turn<1||!['input','prose'].includes(action.from.field))throw Error('对象历史来源无效');}
 if(action.evidence!==undefined){validateObjectEvidence(action.evidence);if(!action.from||action.evidence.turn!==action.from.turn||action.evidence.field!==action.from.field||action.evidence.quote!==action.quote)throw Error('对象历史引文与已核对来源不一致');}
 if((!action.from&&!source.includes(action.quote))||names.some(n=>!action.quote.includes(n)&&!source.includes(n)))throw Error('对象名称、称呼和引文须来自原话或指定历史，不能补造旧事');
 if(action.details!==undefined){
  if(!Array.isArray(action.details)||action.details.length>6)throw Error('对象确定资料过多');const seen=new Set<string>();
  for(const d of action.details){fields(d,['field','value','quote','basis']);
   const allowed=action.objectType==='item'?['name','appearance','holder','owner']:['name','identity','occupation','appearance','gender','age'];
   if(!allowed.includes(d.field)||seen.has(d.field)||!['observed','reported'].includes(d.basis))throw Error('对象资料字段或依据无效');seen.add(d.field);
   text(d.quote,1000);if(!action.quote.includes(d.quote))throw Error('对象资料须引用同一来源中的原句');
   if(d.field==='age'){if(!Number.isSafeInteger(d.value)||d.value<1||d.value>150||!d.quote.includes(String(d.value)))throw Error('年龄须有明确数字来源');}
   else {text(d.value,d.field==='appearance'?160:40);if(!d.quote.includes(d.value))throw Error(`对象资料${d.field}的value须逐字出现在它的quote里；holder/owner填写原文姓名或“你”，不能填人物ID或player/npc等标记。`);}
   if(d.basis==='observed'&&action.from?.field!=='prose')throw Error('玩家自述不能直接登记为已观察的对象事实');
  }
 }
}

function validateObjectEvidence(e:any){
 fields(e,['turn','field','start','end','quote','privatePersonId','archiveId','branchId','revision']);text(e.quote,1000);
 if(!Number.isSafeInteger(e.turn)||e.turn<1||!['input','prose'].includes(e.field)||!Number.isSafeInteger(e.start)||e.start<0||!Number.isSafeInteger(e.end)||e.end-e.start!==e.quote.length||e.end>(e.field==='input'?8000:MAX_STORY_PROSE_LENGTH))throw Error('对象原文位置无效');
 if(e.privatePersonId!==undefined)text(e.privatePersonId,160);
 if(e.archiveId!==undefined){text(e.archiveId,500);text(e.branchId,160);if(!Number.isSafeInteger(e.revision)||e.revision<0)throw Error('对象归档来源无效');}
 else if(e.branchId!==undefined||e.revision!==undefined)throw Error('对象归档来源不完整');
}

export function storyObjectKnownDetails(record:StoryObjectRecord){
 const known:Record<string,string|number>={};
 for(const m of record.mentions)for(const d of m.details??[])if(d.basis==='observed'){
  if(known[d.field]!==undefined&&known[d.field]!==d.value)throw Error('对象确定资料存在冲突，请核对原始来源');known[d.field]=d.value;
 }
 return known;
}
export function storyObjectRecord(state:any,id:string,type:'person'|'item',personId?:string){
 const record=records(state).find(r=>r.id===id);
 if(!record||record.type!==type||!record.mentions.some(m=>visible(m,personId)))throw Error('没有当前会话可引用的叙事对象');
 return record;
}

/** Only quotes in the current channel are exposed; a player's assertion is not a fact. */
export function storyObjectFacts(state:any,personId?:string){
 return records(state).flatMap(record=>{
  const mentions=record.mentions.filter(m=>visible(m,personId));if(!mentions.length)return [];
  const item=record.type==='item'&&record.entityId?state.物品?.实例?.[record.entityId]:null;
  return [{id:record.id,type:record.type,level:record.entityId?'instantiated':'reference',...(record.entityId?{entityId:record.entityId}:{}),knownDetails:storyObjectKnownDetails({...record,mentions}),mentions:structuredClone(mentions),
   ...(item?{currentItem:{holderId:item.ownerEntityId,holderName:state.人物?.列表?.[item.ownerEntityId]?.name??null,legalOwnerId:item.legalOwnerEntityId||null,legalOwnerName:state.人物?.列表?.[item.legalOwnerEntityId]?.name??null,unpriced:true}}:{}),
   meaning:'原话可能是回忆、自述或传闻，不证明能力、所有权或取得成功。knownDetails为原始来源时的确定资料，不是日后现状；currentItem才是本次物品持有/所有权。entityId存在时操作读取实际档案，其他情况没有正式人物或物品资格。'}];
 });
}
/** Retrieval is bounded; exact reference resolution still searches the whole record set. */
export function storyObjectContext(state:any,personId?:string,query=''){
 const all=storyObjectFacts(state,personId),q=key(query);
 const relevant=all.filter(r=>r.mentions.some(m=>[m.name,...m.aliases].some(n=>q.includes(key(n)))));
 const selected=[...relevant,...all.slice().reverse().filter(r=>!relevant.some(x=>x.id===r.id))].slice(0,8);
 return selected.map(r=>({...r,mentions:r.mentions.length<=3?r.mentions:[r.mentions[0],...r.mentions.slice(-2)],omittedMentions:Math.max(0,r.mentions.length-3)}));
}
export function resolveStoryObject(state:any,name:string,personId?:string){
 const matches=storyObjectFacts(state,personId).filter(r=>r.mentions.some(m=>[m.name,...m.aliases].some(n=>key(n)===key(name)))).map(r=>({id:r.id,type:r.type,name:r.mentions.at(-1)!.name,...(r.entityId?{entityId:r.entityId}:{})}));
 return {type:'story-object-resolved',query:name,status:matches.length===1?'unique':matches.length?'ambiguous':'missing',matches,...(matches.length===1?{objectId:matches[0].id}:{})};
}
export function rememberStoryObject(state:any,action:any,source:string,origin:StoryObjectMention['source']){
 validateStoryObjectAction(action,source);
 if(action.from&&(!action.evidence||action.evidence.turn>=origin.turn||action.evidence.privatePersonId!==origin.privatePersonId))throw Error('历史对象来源尚未核对或属于另一会话');
 const all=records(state),known=storyObjectFacts(state,origin.privatePersonId);
 const target=action.objectId===undefined?undefined:all.find(r=>r.id===action.objectId);
 if(action.objectId!==undefined&&(!target||!known.some(r=>r.id===target.id)))throw Error('没有当前会话可引用的叙事对象');
 if(target&&target.type!==action.objectType)throw Error('不能改变叙事对象种类');
 if(!target){
  const names=[action.name,...(action.aliases??[])];
  if(names.some(n=>resolveStoryObject(state,n,origin.privatePersonId).matches.length))throw Error('这个称呼已有叙事记录，请引用原对象或先澄清重名');
  const playerId=state.角色?.主控单位ID;
  const people=(Object.values(state.人物?.列表??{}) as any[]).filter(p=>p.id===playerId||p.locationId===state.地图?.当前地点ID||p.扩展?.相遇记录?.[playerId]);
  const items=(Object.values(state.物品?.实例??{}) as any[]).filter(i=>i.ownerEntityId===playerId);
  if((action.objectType==='person'?people:items).some(p=>names.some(n=>key(n)===key(p.name??''))))throw Error('已有正式对象，请沿用真实档案，不再创建叙事副本');
 }
 const record:StoryObjectRecord=target??{id:`object:${origin.id}`,type:action.objectType,mentions:[]};
 if(record.mentions.some(m=>m.source.id===origin.id))throw Error('本次对象记录已经提交');
 // No conversion of a private reference into public knowledge by a lookup/update.
 if(target&&!target.mentions.some(m=>m.source.privatePersonId===origin.privatePersonId))throw Error('不能通过关联对象将另一会话的私有记录公开');
 record.mentions.push({name:action.name,aliases:[...(action.aliases??[])],quote:action.quote,reason:action.reason,
  ...(action.evidence?{evidence:structuredClone(action.evidence)}:{}),...(action.details?{details:structuredClone(action.details)}:{}),
  source:structuredClone(origin),recordedAt:structuredClone(state.世界.时间),locationId:state.地图.当前地点ID});
 storyObjectKnownDetails(record);
 if(record.entityId){
  const entity=record.type==='person'?state.人物?.列表?.[record.entityId]:state.物品?.实例?.[record.entityId];
  if(!entity||Object.entries(storyObjectKnownDetails(record)).some(([field,value])=>entity.扩展?.storyObjectBasis?.[field]!==value))throw Error('新资料与已登记对象来源不一致，不能覆盖既定事实');
 }
 if(!target){state.扩展??={};(state.扩展.storyObjects??=[]).push(record);}
 return {state,receipt:{type:'story-object-remembered',objectId:record.id,objectType:record.type,level:'reference',
  mention:structuredClone(record.mentions.at(-1)),summary:'已保留对象称呼与原话来源，未创建能力或发放物品。'}};
}

export function validateStoryObjects(state:any){
 if(state.扩展?.storyObjects===undefined)return;
 if(!Array.isArray(state.扩展.storyObjects))throw Error('叙事对象存档无效');
 const ids=new Set<string>(),sources=new Set<string>();
 for(const r of records(state)){
  fields(r,['id','type','mentions','entityId']);text(r.id,200);
  if(ids.has(r.id)||!['person','item'].includes(r.type)||!Array.isArray(r.mentions)||!r.mentions.length)throw Error('叙事对象身份无效');ids.add(r.id);
  for(const m of r.mentions){
   fields(m,['name','aliases','quote','reason','source','recordedAt','locationId','evidence','details']);
   if(!Array.isArray(m.aliases))throw Error('叙事对象存档缺少标准称呼列表');
   validateStoryObjectAction({kind:'remember-object',objectType:r.type,name:m.name,aliases:m.aliases,quote:m.quote,reason:m.reason,...(m.evidence?{from:{turn:m.evidence.turn,field:m.evidence.field},evidence:m.evidence}:{}),...(m.details?{details:m.details}:{})},[m.quote,m.name,...m.aliases].join(' '));
   const s=m.source;fields(s,['id','branchId','turn','step','privatePersonId']);text(s.branchId,160);text(s.id,190);
   if(!Number.isSafeInteger(s.turn)||s.turn<1||s.turn>=state.扩展.story.nextTurn||!Number.isSafeInteger(s.step)||s.step<0||s.step>11||s.id!==`story:${s.branchId}:${s.turn}:${s.step}`||sources.has(s.id))throw Error('叙事对象来源无效');sources.add(s.id);
   if(s.privatePersonId!==undefined&&(typeof s.privatePersonId!=='string'||!state.人物?.列表?.[s.privatePersonId]||s.privatePersonId===state.角色?.主控单位ID))throw Error('叙事对象私聊范围无效');
   if(m.evidence&&(m.evidence.turn>=s.turn||m.evidence.privatePersonId!==s.privatePersonId))throw Error('对象历史来源与记录时点或权限不一致');
   const ledger=state.扩展.story,turn=ledger.active;
   if(s.branchId===(ledger.inheritedBranchId??ledger.branchId)&&s.turn===turn?.number){
    const result=turn.results?.[s.step],a=result?.action;
    if(result?.status!=='succeeded'||a?.kind!=='remember-object'||result.receipt?.objectId!==r.id||s.privatePersonId!==turn.privatePersonId||a.objectType!==r.type||a.name!==m.name||a.quote!==m.quote||a.reason!==m.reason||JSON.stringify(a.aliases??[])!==JSON.stringify(m.aliases)||JSON.stringify(a.evidence)!==JSON.stringify(m.evidence)||JSON.stringify(a.details)!==JSON.stringify(m.details)||!m.evidence&&!result.source.includes(m.quote))throw Error('叙事对象与当前来源回执不一致');
   }
   fields(m.recordedAt,['day','hour','minute']);const t=m.recordedAt;
   if(!Number.isSafeInteger(t.day)||t.day<1||!Number.isSafeInteger(t.hour)||t.hour<0||t.hour>23||!Number.isSafeInteger(t.minute)||t.minute<0||t.minute>59||typeof m.locationId!=='string'||!state.地图?.地点?.[m.locationId])throw Error('叙事对象记录时点无效');
  }
  if(r.id!==`object:${r.mentions[0].source.id}`)throw Error('叙事对象与首次来源不一致');
  if(r.mentions.some(m=>m.source.privatePersonId!==r.mentions[0].source.privatePersonId))throw Error('叙事对象混入其他会话');
  const known=storyObjectKnownDetails(r);
  if(r.entityId!==undefined){
   text(r.entityId,200);const entity=r.type==='person'?state.人物?.列表?.[r.entityId]:state.物品?.实例?.[r.entityId];
   if(!entity||entity.扩展?.storyObjectId!==r.id||Object.entries(known).some(([field,value])=>entity.扩展?.storyObjectBasis?.[field]!==value))throw Error('叙事对象正式关联或确定资料无效');
   if(r.type==='item'&&(entity.templateId!=='story-keepsake'||entity.quantity!==1||entity.valuePoints!==0||entity.type!=='道具'||entity.provenance?.storyObjectId!==r.id||!state.容器?.列表?.[entity.containerId]?.itemIds.includes(entity.id)||state.容器.列表[entity.containerId].ownerEntityId!==entity.ownerEntityId))throw Error('叙事纪念物的身份、能力边界或所有权链无效');
   if(r.type==='item'&&(Object.keys(entity.payload??{}).some(k=>k!=='storedAtLocationId')||entity.legalOwnerEntityId&&!state.人物?.列表?.[entity.legalOwnerEntityId]))throw Error('叙事纪念物不能夹带能力或虚构所有人');
  }
 }
}
