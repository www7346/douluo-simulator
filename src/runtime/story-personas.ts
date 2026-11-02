import {rules} from '../rules';
import {subjectivePerson,relationshipPresentation} from '../shared/cognition-view';
import {personalChangeContext,changeInteractionContext} from './person-change-context';

/** Curated characterization from the user-provided Reborn V2.6 card.
 * No source prompts, mechanical claims, future events or relationship outcomes are imported.
 */
const REFERENCES:Record<string,{entry:string;temperament:string;speech:string;priorities:string}>={
 'slaughter-king':{entry:'斗一：唐晨（条目363，寄生时期）',temperament:'受血红九头蝙蝠寄生控制，作为杀戮之都统治者维护自身权威，对破坏规则者充满敌意。',speech:'冷峻威严，带有压迫感，面对有强大背景者也会权衡。',priorities:'维护杀戮之都的统治；此时期失去唐晨本我意志及昊天宗、波塞西相关记忆，不沿用清醒宗主的故交情谊。'},
 'xue-qinghe':{entry:'斗一：雪清河（条目340）',temperament:'以温和谦逊的太子形象待人，行事谨慎，善于观察与招揽有才能的人。',speech:'礼貌克制，重视礼仪，谈及人才时愿意耐心倾听。',priorities:'维护潜伏身份与政治目标；礼遇和招揽意向不等于已给予物品、官职、资源或做出约定。'},
 'xiao-wu-tournament':{entry:'斗一：小舞',temperament:'活泼机敏，护短仗义，对陌生人和探究自己底细的人保持警惕；张扬有时是保护自己的方式。',speech:'直率有活力，熟悉的人面前较亲近，受到威胁时态度果断。',priorities:'重视安全、归属与认可的同伴；对玩家的信任需由经历建立，不把背景身份自动当成在场人物共享知识。'},
 'dai-mubai-tournament':{entry:'斗一：戴沐白',temperament:'强势，重视实力与同伴，在团队中习惯承担领头和正面承压的责任；有逃避皇室斗争的经历。',speech:'豪爽果断，习惯用肯定句，安排配合时较有主导性。',priorities:'重视实力、尊严与团队职责；不会因为玩家指定剧情就服从或改变立场。'},
 'zhu-zhuqing-tournament':{entry:'斗一：朱竹清',temperament:'寡言，自律坚韧，警惕陌生人，在压力下保持冷静；以疏离保护自己，对认可的同伴有情义。',speech:'简短直接，不热衷无谓交际，更多用行动表达关切。',priorities:'希望通过变强掌握自己的命运；信任需要共同经历，不因玩家要求而立刻建立亲密关系。'},
 'ma-hongjun-tournament':{entry:'斗一：马红俊',temperament:'直率，重视兄弟情谊，贪吃，爱调侃和搭讪，朋友受委屈时容易主动出头。',speech:'口语化，俏皮，常用玩笑表达态度，认真时直截了当。',priorities:'重视同伴与自身实力；习惯或自称的借口不等于当前仍有邪火机械副作用，实际能力以持久档案为准。'},
 'ning-rongrong-tournament':{entry:'斗一：宁荣荣',temperament:'有教养，机敏，有原则；受到贬低会反驳，也能够反思不足，不以任性作为常态。',speech:'平时礼貌，在信任的人面前较为俏皮，谈及团队配合时观察细致。',priorities:'希望凭自己的能力获得认可，重视同伴与团队协作；具有自己的判断，不因玩家叙述而自动接受邀约或建立关系。'},
 'zhao-wuji':{entry:'斗一：赵无极',temperament:'粗犷桀骜，护短，粗中有细，遇强敌懂得审时度势。',speech:'直率、粗声大气，不爱繁文缛节。',priorities:'重视学院责任与自己认可的人，反感倚强凌弱；保护他人出于自身判断，不默认听命于玩家。'},
 'yu-xiaogang-notting':{entry:'斗一：玉小刚',temperament:'重视理论与证据，对学术评价敏感，理性克制，情感表达较为回避。',speech:'严谨，习惯分析原理、指出训练中的问题。',priorities:'重视研究、训练与理论验证，不会因为玩家一句请求就收徒或传授全部知识。'},
 'oscar-tournament':{entry:'斗一：奥斯卡',temperament:'乐观幽默，不拘小节，重要之人遇险时认真坚定。',speech:'常用玩笑缓和气氛，严肃问题上能够收起戏谑。',priorities:'重视同伴与自身成长，正在寻找食物系魂师的独立战斗之路；关切不等于已经答应玩家的请求，后期镜像能力不能提前使用。'},
};

const recordedIdentity=(person:any)=>({age:Number.isFinite(person.age)&&person.age>0?person.age:null,
 gender:person.gender&&!['未知','未登记','未设定'].includes(person.gender)?person.gender:null});

/** Registered identity needed to address a speaker. No inventory, private
 * characterization, location or remote observation is added to chat scope. */
export function storyConversationIdentity(person:any,includePhysicalIdentity=true){
 return {id:person.id,name:person.name,characterization:{recorded:includePhysicalIdentity?recordedIdentity(person):{}}};
}

/** Current identity and remembered background, limited to the existing viewer. */
export function storyBackgroundContext(state:any,personId:string,viewerId=state.角色?.主控单位ID){
 const context=rules.backgroundOpening.personContext(state,personId,viewerId);
 if(!context||!context.relationship&&!context.history?.length&&!context.situation)return null;
 const view=subjectivePerson(state,{id:viewerId,backgroundContext:context}).backgroundContext;
 if(view.relationship)view.relationship=relationshipPresentation(view.relationship,viewerId,personId);
 return view;
}

export function storyPersona(state:any,person:any,observerId=person.id){
 const disguise=rules.disguise.presentation(state,person.id,observerId);
 if(person.id!==observerId&&(disguise.disguised||disguise.identityHidden))return {profile:null,reference:null,recorded:{personality:null,occupation:disguise.identity||person.occupation||null,faction:null,appearance:disguise.appearance,age:person.age??null,gender:disguise.gender},...(disguise.knownIdentity?{knownIdentity:disguise.knownIdentity}:{}),...(disguise.voice?{voice:disguise.voice}:{}),...(disguise.detected?{observedDisguise:{detected:true,appearance:disguise.appearance}}:{})};
 const canonicalId=state.战斗单位?.列表?.[person.id]?.扩展?.角色库ID??person.扩展?.角色库ID;
 const reference=REFERENCES[canonicalId];
 const profile=rules.backgroundOpening.effectiveProfile(state,person.id);
 const profileData=profile?.status==='complete'?structuredClone(profile.data):null;
 const rewritten=Object.values(state.扩展?.personaRewrites?.patches??{}).some((r:any)=>r.targetId===person.id&&(r.retention==='保留'||state.状态实例?.列表?.[r.sourceStatusId]?.状态==='生效'));
 // Only the registered background-event fields carry this source. A forgotten
 // purchase must not be restored through biography or a named opening goal;
 // temperament, speech and independently authored profiles remain untouched.
 if(profileData&&profile.backgroundSource?.remembered===false)for(const field of profile.backgroundFields??[]){
  if(Object.hasOwn(profile.backgroundFallback??{},field))profileData[field]=structuredClone(profile.backgroundFallback[field]);
  else delete profileData[field];
 }
 const boundary=rules.personChangeKnowledge.memoryBoundary(state,person.id);
 const patches=Object.values(state.扩展?.personaRewrites?.patches??{}) as any[];
 const fullMemoryReplacement=patches.some(r=>r.targetId===person.id&&Object.hasOwn(r.fields??{},'cognition.memories')&&(r.retention==='保留'||state.状态实例?.列表?.[r.sourceStatusId]?.状态==='生效'))||(state.扩展?.personaRewrites?.baselines?.[person.id]?.['cognition.memories']?.order??0)>0;
 if(profileData&&fullMemoryReplacement&&boundary.order>0){
  for(const field of ['biography','shortTermGoal','longTermGoal']){
   const key='profile.'+field,baseline=state.扩展?.personaRewrites?.baselines?.[person.id]?.[key];
   const current=patches.some(r=>r.targetId===person.id&&r.order>=boundary.order&&(r.retention==='保留'||state.状态实例?.列表?.[r.sourceStatusId]?.状态==='生效')&&r.fields?.[key]===profileData[field]);
   if(!current&&!(baseline?.order>=boundary.order&&baseline.value===profileData[field]))delete profileData[field];
  }
 }
 const playerId=state.角色?.主控单位ID;
 const physical=person.id===observerId||rules.actions.perception(state,observerId,person.id,'vision')?person:person.扩展?.已知档案?.[observerId];
 const relationshipToPlayer=playerId&&person.id!==playerId?storyBackgroundContext(state,playerId,person.id)?.relationship:null;
 return {
  ...(profileData?{profile:profileData}:{}),
  ...(relationshipToPlayer?{relationshipToPlayer}:{}),
  ...(person.id===observerId&&person.扩展?.身份呈现?{identityPresentation:structuredClone(person.扩展.身份呈现)}:{}),
  recorded:{personality:person.personality?.trim()||null,occupation:person.occupation||null,faction:person.faction||null,
   appearance:physical?.appearance&&physical.appearance!=='原作人物档案'?physical.appearance:null,
   ...(physical?recordedIdentity(physical):{age:null,gender:null})},
  ...(person.id===observerId&&person.扩展?.cognitivePersona?{personalSettings:structuredClone(person.扩展.cognitivePersona)}:{}),
  personalExperience:person.id===observerId?personalChangeContext(state,person.id):{ownerId:observerId,
   experiences:rules.personChangeKnowledge.facts(state,observerId,{targetId:person.id}),
   heardReactions:changeInteractionContext(state,observerId,person.id)},
  reference:reference&&!rewritten&&!boundary.order?{source:'斗罗大陆Reborn V2.6 正式版',...reference}:null,
 };
}
