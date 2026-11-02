import {skillArtwork,itemArtwork} from '../runtime/generated-art';
import {abilityPresentation,modifierPresentation} from '../runtime/ability-presentation';
import {playerText} from '../runtime/player-text';
import type {ChoiceMotif} from './components/ChoiceEmblem';
import displayLabels from '../shared/display-labels.json';

/** A view of existing effect facts only. No scoring or generated mechanics. */
export function candidateCardPresentation(skills:any[],state:any,kind='魂技',identity?:{choiceRole?:{id:string};fixedForm?:{id:string}}){
  const nodes=skills.flatMap(skill=>(skill.effectGraph??skill.graph)?.nodes??[]);
  const ids=nodes.map(node=>String(node.effectId));
  const includes=(pattern:RegExp)=>ids.some(id=>pattern.test(id));
  const attribute=nodes.map(node=>node.params?.类型).find(value=>displayLabels.attributes.includes(value));
  const roleMotifs:Record<string,ChoiceMotif>={武器:'blade',防具:'shield',饰品:'spirit',手套:'gloves',armor:'shield','mind-guard':'shield',vitality:'heal','soul-capacity':'spirit',accuracy:'strike','soul-accuracy':'spirit',strike:'blade',reduction:'shield',initiative:'wing',mobility:'wing','opening-shield':'shield','attribute-build':'spirit',damage:'strike',erosion:'poison',control:'bind',defense:'shield',recovery:'heal',enhance:'spirit',weaken:'blade',movement:'wing',counter:'frost',summon:'summon'};
  const effectMotif:ChoiceMotif=roleMotifs[identity?.choiceRole?.id??'']??(includes(/burn/)?'flame':includes(/poison/)?'poison':includes(/bind|slow|paralysis|move.pull|move.knockback/)?'bind':
    includes(/charm|fear|copy|soul_damage/)?'spirit':includes(/heal|restore|regeneration|revive/)?'heal':
    includes(/shield|invulnerable|reflect|status_guard|resistance_shift/)?'shield':includes(/summon|transform/)?'summon':includes(/^move\./)?'wing':attribute==='冰'?'frost':attribute==='火'?'flame':attribute==='灵魂'?'spirit':'strike');
  const rows=skills.map(skill=>{
    const info=abilityPresentation({...skill,category:skill.category??kind},state);
    if(info.restraint)return {name:playerText(skill.name,state,'拘束器'),primary:info.restraint.modes.map(mode=>`${mode.name}：${mode.effects.join('；')||'解除本装置限制'}`),context:[`适用等级上限 ${info.restraint.maxLevel}`,`挣脱难度 ${info.restraint.breakDifficulty}`],passive:[],costs:['佩戴器具后生效'],limits:[],description:info.description,condition:info.restraint.conditions};
    const primary=info.primary.map(effect=>`${info.activation==='hybrid'?(effect.passive?'被动 · ':'主动 · '):''}${['status.resistance_shift','status.status_guard','passive.equipment_stat'].includes(effect.effectId)?effect.values.join(' · '):[effect.name,...effect.values].join(' · ')}`);
    const context=info.context.flatMap(group=>group.entries.map(effect=>[effect.name,...effect.values].join(' · ')));
    if(info.host)context.push(info.host.summary);
    if(info.medicine?.medicine){context.unshift(`${info.medicine.classification} · ${info.medicine.formLabel} · ${info.medicine.routeLabel} · 每件 ${info.medicine.doses} 剂${info.medicine.sourceDurationMinutes?` · 外部药源 ${info.medicine.sourceDurationMinutes} 分钟`:''}`);if(info.medicine.warning)context.push(info.medicine.warning);}
    const passive=modifierPresentation(skill.modifiers,skill.passiveCombat,state).map(row=>`${row.label} ${row.value}`);
    const costs=info.activation==='passive'?[info.passiveCondition,'无需施放',...info.costLines]:[...info.costLines,info.cost?`魂力 ${info.cost}`:'不消耗魂力',...(info.cooldown?[`冷却 ${info.cooldown} 回合`]:[]),...(skill.disposable?['每次使用消耗一件']:Number(skill.durabilityCost)>0?[`耐久消耗 ${skill.durabilityCost}`]:[])];
    const limits=[info.usage.perBattleLimit?`每场 ${info.usage.perBattleLimit} 次`:'',info.usage.dailyLimit?`每日 ${info.usage.dailyLimit} 次`:'',info.usage.worldCooldownDays?`间隔 ${info.usage.worldCooldownDays} 日`:''].filter(Boolean);
    return {name:playerText(skill.name??skill.名称,state,'魂环魂技'),primary,context,passive,costs,limits,description:info.description,condition:info.activation==='hybrid'?info.passiveCondition:''};
  });
  const tags=[...new Set(skills.flatMap(skill=>{const info=abilityPresentation({...skill,category:skill.category??kind},state);return info.restraint?['拘束器','佩戴器具']:[info.activationLabel,...(info.host?['宿主能力']:[]),...info.primary.map(effect=>effect.name),...(kind==='魂导器'&&Object.keys(skill.modifiers?.attributes??{}).length?['属性强化']:[])];}))];
  const form=({sword:'blade',dagger:'blade',robe:'breastplate',helm:'crown',bracelet:'bracer'} as Record<string,string>)[identity?.fixedForm?.id??'']??identity?.fixedForm?.id;
  const motif:ChoiceMotif=kind==='丹药'?'vial':kind==='暗器'?'blade':kind==='魂导器'&&form&&['blade','bracer','breastplate','pendant','boots','crown','necklace','staff','gloves'].includes(form)?form as ChoiceMotif:kind==='魂导器'?'device':effectMotif;
  const art=kind==='魂技'?skillArtwork({effectGraph:{nodes}}):itemArtwork({...identity,skills},kind);
  return {art,motif,effectMotif,attribute,rows,tags};
}
