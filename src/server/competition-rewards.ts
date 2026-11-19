import {rules} from '../rules';
import {playerText} from '../runtime/player-text';
import {abilityPresentation,modifierPresentation} from '../runtime/ability-presentation';
import {rewardName,ringLore} from './reward-presentation';

const PLACEMENTS:Record<string,string>={champion:'冠军',runner_up:'亚军',semifinalist:'四强',quarterfinalist:'八强',round_of_16:'十六强'};

function prizeItem(state:any,item:any,currentDetails=false) {
  const details=rules.world.inspectItem(state,item);
  // Prize properties are intrinsic; current equipment, buffs and available soul power do not alter the preview.
  const intrinsic={...state,角色:{...state.角色,主控单位ID:''},战斗单位:{列表:{}}};
  const skills=[...(details.passiveEffectGraph?[{name:item.type==='魂骨'?'魂骨庇护':'装备被动',category:item.type,effectGraph:details.passiveEffectGraph}]:[]),...details.skills];
  const ring=item.payload?.ringSource;
  return {id:item.id,name:playerText(rewardName(item),state,'赛事奖品'),type:details.type,quality:playerText(details.quality,state,'普通'),quantity:item.quantity??1,
    form:[...new Set([details.fixedForm?.kind,details.fixedForm?.name,details.form])].filter(Boolean).map(value=>playerText(value,state,'')).join(' · '),
    slot:item.payload?.slot??'',years:ring?.years??item.payload?.years??null,currentDetails,
    modifiers:modifierPresentation(details.modifiers,details.passiveCombat,state),
    abilities:skills.map(skill=>{const info=abilityPresentation(skill,intrinsic);return {name:playerText(skill.name,state,'装备能力'),activation:info.activationLabel,cost:info.cost,cooldown:info.cooldown,
      effects:info.effects.map(effect=>({name:effect.name,values:effect.values}))};}),
    ring:ring?{...ringLore(item),divisionLevel:ring.divisionLevel,ringOrdinal:ring.ringOrdinal}:null};
}

function rewardDetails(state:any,reward:any,items:any[]) {
  const materials=new Map<string,any>();
  for(const [index,row] of (reward.materialBatches??[]).entries()) {
    const key=row.fingerprint??String(index),previous=materials.get(key);
    materials.set(key,{name:playerText(row.displayName,state,'赛事材料'),quantity:Number(previous?.quantity??0)+Number(row.quantity??0),unitValue:row.unitValue??null});
  }
  return {gold:reward.gold??0,experience:reward.experience??0,experienceSuppressed:reward.experience===0&&Number(reward.prizeExperience??0)+Number(reward.combatExperience??0)>0,prizeExperience:reward.experience===0?0:reward.prizeExperience??null,
    combatExperience:reward.experience===0?0:reward.combatExperience??null,newBest:!!reward.newBest,items,materials:[...materials.values()]};
}

/** Requested only by the rewards dialog; the ordinary bracket/history query stays lightweight. */
export function competitionRewards(state:any,competition:any) {
  if(!competition)return null;
  const complete=['completed','failed'].includes(competition.status),reward=competition.reward;
  if(reward) {
    const saved=new Map<string,any>((reward.itemSnapshots??[]).map((item:any)=>[item.id,item]));
    const items=(reward.itemIds??[]).map((id:string)=>{
      const snapshot=saved.get(id),item=snapshot??state.物品?.实例?.[id];
      return item?prizeItem(state,item,!snapshot):{id,name:'已发放的赛事奖品',quantity:1,unavailable:true};
    });
    return {complete,placement:PLACEMENTS[competition.placement]??'本届成绩',wins:competition.wins??0,reward:rewardDetails(state,reward,items),previews:[]};
  }
  return {complete,previews:Object.keys(competition.rewardPools??{}).map(placement=>{
    const projected=rules.arena.previewCompetitionRewardContents(state,competition,placement);
    return {placement:PLACEMENTS[placement]??placement,...rewardDetails(state,projected,projected.items.map((item:any)=>prizeItem(state,item)))};
  })};
}
