import {rules} from '../rules';
/** A completed opening projection, never a world write or a second rule set. */
export function openingRingPresentationState(actor:any,preparedSoul?:any){
 const f=rules.foundation,state=f.makeDefaultState();
 const compiled=preparedSoul?null:rules.martialSoul.finalizeDraft({...actor.draft.martialSoulDrafts[0],playerConfirmed:true},{budget:actor.budget,id:'background-preview-soul'});
 const soul=structuredClone(preparedSoul??f.normalizeMartialSoul({id:compiled.id,名称:compiled.name,持有者单位ID:'background-preview',扩展:{结构化武魂:compiled}},'background-preview'));
 const id=soul.持有者单位ID;
 soul.魂环ID列表=Array.from({length:actor.ringCount},(_,i)=>`opening-ring-preview-${i+1}`);
 state.角色.主控单位ID=id;state.武魂.列表[soul.id]=soul;
 state.成长.列表[id]={魂力等级:actor.level,武魂ID列表:[soul.id],激活武魂ID:soul.id};
 state.战斗单位.列表[id]=f.normalizeCombatant({id,名称:actor.draft.name,六维:{基础:actor.draft.attributes},成长:{类型:'魂师',魂力等级:actor.level}},{id,kind:'魂师NPC',level:actor.level});
 state.战斗单位.列表[id]=f.applyMartialSoulCombatModifiers(state.战斗单位.列表[id],soul,state);
 return {state,soul,ownerId:id};
}
