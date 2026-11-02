import {unitAbilities,type UnitActionsReader} from './ability-presentation';
import {abilitySourceResolver} from './ability-sources';

export function ownedAbilityCatalog(state:any,unitId:string,readActions?:UnitActionsReader) {
  const resolve=abilitySourceResolver(state,unitId);
  const skills=new Map(unitAbilities(state,unitId,readActions).map(skill=>[skill.id,skill]));
  for(const soul of Object.values(state.武魂?.列表??{}) as any[])if(soul.持有者单位ID===unitId)for(const ringId of soul.魂环ID列表??[])for(const skillId of state.魂环?.列表?.[ringId]?.魂技ID列表??[]) {
    const skill=state.技能?.列表?.[skillId];if(skill)skills.set(skillId,skill);
  }
  return [...skills.values()].map(skill=>({skill,source:resolve(skill)}));
}

