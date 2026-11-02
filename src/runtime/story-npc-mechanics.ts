import {rules} from '../rules';
import {validateStoryPersonCreation} from './story-person-creation';

/** Resolve existing deferred NPCs only for an operation that consumes mechanical data. */
export function ensureStoryNpcMechanics(state:any,rawId:unknown,sourceId:string){
 const id=typeof rawId==='string'&&rules.arena.CHARACTER_CATALOG[rawId]?rules.arena.persistentCharacterId(rawId):rawId;
 const person=state.人物?.列表?.[id as string],pending=person?.扩展?.deferredNpc;
 if(!pending)return state;
 if(person.status==='dead'||!rules.actions.colocated(state,person.id,state.角色.主控单位ID))throw Error('人物须在场且能够行动才能补齐规则资料');
 const block=rules.world.worldActionBlockReason(state,{allowActivities:['expedition']});if(block)throw Error(block);
 const result=rules.world.promoteNpc(state,{personId:person.id},`${sourceId}:npc-mechanics:${person.id}`);
 return result.state;
}
export function storyNpcMechanicsFacts(person:any){return person?.扩展?.deferredNpc?{status:'pending',meaning:'身份已登记，能力与初始财产尚未按规则需要生成；空能力或空库存不是已经证实没有。已经实际收到的财物仍有效。查档、说话和重逢不生成能力；切磋或需要六维数值的行动复用原型补齐一次。'}:person?.扩展?.resolvedNpc?{status:'resolved',meaning:'先前未知的能力和初始财产已按原人物原型补齐一次；这是档案实例化，不是本轮觉醒、升级或获得奖励。身份、已有交往和实际收到的财物保留。'}:null;}
export function validateDeferredStoryNpcs(state:any){
 for(const p of Object.values(state.人物?.列表??{}) as any[]){const d=p.扩展?.deferredNpc;if(d===undefined)continue;
  if(!d||Object.keys(d).some(k=>!['version','sourceId','options'].includes(k))||d.version!==1||typeof d.sourceId!=='string'||!d.sourceId||d.sourceId!==p.扩展?.故事来源?.sourceId||!p.扩展?.storyObjectId||p.tier!=='light'||p.combatantId||state.战斗单位?.列表?.[p.id]||state.成长?.列表?.[p.id])throw Error('人物待生成资料与来源或当前能力不一致');
  if(!d.options||typeof d.options!=='object'||Array.isArray(d.options)||Object.keys(d.options).some(k=>!['level','martialSoulTemplateId','martialSoulDraft'].includes(k)))throw Error('人物待生成参数无效');
  const input={kind:'introduce-person',objectId:p.扩展.storyObjectId,archetypeId:p.扩展.archetypeId,name:p.name,...d.options};
  if(d.options.martialSoulDraft!==undefined)Object.assign(input,{martialSoulDescription:'已验证的待用武魂草案',martialSoulTemplateId:''});
  validateStoryPersonCreation(input);
 }
}
