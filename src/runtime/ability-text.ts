import {playerText} from './player-text';
import {effectDisplayNames} from '../shared/effect-display';
import displayLabels from '../shared/display-labels.json';
const EFFECT_NAMES:Record<string,string> = {
  'status.amplify':'持续增幅','target.allies':'自选友方',
  'realm.capture':'收入独立空间',
  'realm.deploy':'召唤对应画中人物',
  'release.touch':'接触施展','release.melee':'近身施展','release.projectile':'远程投射',
  'target.single':'一名目标','target.cluster':'一小群目标','target.line':'直线范围','target.self':'作用于自身','target.aura':'光环范围','target.cone':'扇形范围','target.burst':'指定圆形范围','target.chain':'连续跳跃至多个目标',
  'check.physical_attack':'物理命中判定','check.soul_attack':'魂力命中判定','check.save':'目标可尝试抵抗',
  'payload.restore':'生命与魂力恢复','status.buff':'能力强化或削弱','status.desire':'欲火','modifier.next_skill':'下次施放与制造增幅','summon.entity':'召唤助战','domain.field':'持续领域',
  'passive.equipment_stat':'装备常驻加成','status.status_guard':'状态防护','status.resistance_shift':'属性防护',
  'status.invulnerable':'攻击抵挡','status.eternal_wound':'持续创伤','copy.skillset':'技能复制','reaction.reflect':'伤害反射与吸收'
};
const MODIFIER_NAMES:Record<string,string> = {healthMax:'生命上限',soulPowerMax:'魂力上限',physicalDefense:'物理防御',mentalDefense:'魂技防御',speed:'速度'};

export function abilityEffectName(effectId:string,state:any):string {
 return globalThis.SoulSkillProse?.effectNames?.[effectId]??EFFECT_NAMES[effectId]??playerText((displayLabels.labels as Record<string,string>)[effectId]??effectDisplayNames[effectId],state,'特殊效果');
}

export function modifierPresentation(modifiers:any={},passive:any={},state:any):Array<{label:string;value:string}> {
 modifiers??={};passive??={};
  const result:Array<{label:string;value:string}>=[];
  for(const [key,value] of Object.entries(modifiers.attributes??{}))if(Number(value))result.push({label:playerText(key,state,'属性'),value:`${Number(value)>0?'+':''}${value}`});
  for(const [key,label] of Object.entries(MODIFIER_NAMES))if(Number(modifiers[key]))result.push({label,value:`${Number(modifiers[key])>0?'+':''}${modifiers[key]}`});
  for(const resistance of modifiers.resistances??[])result.push({label:'伤害抗性',value:playerText(resistance,state,'特殊抗性')});
  for(const [key,value] of Object.entries(passive))if(/[\u3400-\u9fff]/u.test(key)&&Number(value))result.push({label:playerText(key,state,'战斗加成'),value:`${Number(value)>0?'+':''}${value}`});
  return result;
}

