import {rules} from '../rules';
import {abilityWritingMeaning} from './ability-writing';

// Wording for the registered hooks used by foundation/combat, not additional abilities.
// All current trait templates have one level. Keep this catalogue exhaustive.
const hookMeanings:Record<string,(parameter:string)=>string>={
  independentRealm:p=>{if(p==='所选项目')return Object.keys(rules.residentRealms.PROFILES).map(id=>hookMeanings.independentRealm(id)).join('；');const profile=rules.residentRealms.PROFILES[p];if(!profile)throw Error('独立空间缺少已登记规则');return `自带九庭独立空间，每枚实际魂环开放一个永久席位，最多${profile.maxSlots}人。符合条件的女性可以收入、分押或合押，环境与活动许可由画主管理；人物身份与原有经历保留。服从达到${profile.realBodyThreshold}才能真身出画，真身为原人物，按普通队伍人数、修炼与吸环规则行动。投影保留原人物完整生命、六维、命中与抵抗，伤害、治疗、护盾随画主实际1—3/4—6/7—9环分别为80%/90%/100%；首次召唤20/30/40魂力，同场重召30/45/60魂力，战中每画主回合每具维持2/3/4魂力，施法共用画主魂力。击散后可在画主下一次合法主行动重召，冷却和次数沿用原人物。投影是召唤物，不占普通队伍人数，可在场内外召唤；本人意识进入投影，不能反抗画主，原体不能并行行动。投影没有固定持续时限，依附召唤者；实际主动召回、被击散、来源失效或无法支付维持费时才结束，不能由原体魂力推算成持续若干时辰。`;},
  abilityScore:p=>`${p}增加1点。`,
  checkBonus:p=>`${p}增加1点。`,
  saveAdvantage:p=>`使用${p}抵抗效果时获得豁免优势。`,
  initiativeAdvantage:()=> '决定先手顺序时获得优势。',
  breakFreeBonus:()=> '挣脱束缚的判定增加2点。',
  escapeBonus:()=> '撤退判定增加2点。',
  soulPowerCapacity:()=> '魂力上限提高10%。',
  soulPowerDiscount:()=> '施放的魂力消耗降低10%，与其他消耗修正共同结算。',
  sustainDiscount:()=> '维持能力的魂力消耗减少1点，最低为0。',
  killSoulRecovery:()=> '每场战斗首次完成击杀时，恢复魂力上限的10%，不超过魂力上限。',
  attributeMastery:p=>`${p}属性的武魂魂技获得1点命中或抵抗难度加成。`,
  resistance:p=>`对应武魂启用时，自身受到的${p}属性伤害减半。`,
  channelMastery:p=>`属于${p}方向的武魂魂技获得1点命中或抵抗难度加成。`,
  baseActionPower:()=> '武魂基础动作的伤害加值增加1点。',
  baseActionAccuracy:()=> '武魂基础动作的命中判定增加1点。',
  defenseBonus:p=>`${p}增加1点。`,
  soulCostIncrease:()=> '施放的魂力消耗乘以1.25，与其他消耗修正共同结算。',
  advancedFirstRoundLock:()=> '战斗第一回合无法使用属于高阶机制方向的魂技，不限制普通攻击。',
  sustainCostIncrease:()=> '维持能力的魂力消耗增加1点。',
  physicalVulnerability:()=> '对应武魂启用时，自身受到的物理属性伤害翻倍。',
  damagedAttackPenalty:()=> '生命低于上限一半时，攻击命中判定降低1点。',
  sourcePower:()=> '对应武魂的原生能力数值载荷每级增强5%，最多15%；不增加目标、范围、期限或机制等级。',
  sourceControl:()=> '对应武魂的原生控制抵抗难度与后续挣脱难度增加1点。',
  desireBacklash:()=> '发动对应武魂的主动能力后承担一级欲火；未消退时再次发动升一级，最多三级，持续十个人分钟。',
};

export function martialSoulTraitMeaning(template:any,parameter='所选项目'){
  const describe=hookMeanings[template.hook];
  if(!describe)throw new Error(`武魂特性缺少准确说明：${template.id}`);
  const name=rules.martialSoul.ATTRIBUTE_REGISTRY[parameter]?.damageType??rules.martialSoul.CHANNEL_REGISTRY[parameter]?.name??parameter;
  return describe(name);
}

export function martialSoulTraitTiming(template:any){
 if(template.hook==='independentRealm')return '建立后持续容纳人物。收入、调遣与管理须本人清醒并能使用来源武魂；收起武魂保留囚位与居住，画主死亡时空间失效，人物退出。';
 if(template.hook==='desireBacklash')return '触发：成功发动对应武魂的主动能力后。结束：按自身经历的时间持续10分钟；收起武魂不会立即消退，再次触发会叠加强度。';
 if(template.hook==='advancedFirstRoundLock')return '触发：对应武魂启用且处于战斗第一回合。结束：进入第二回合，或收起对应武魂。';
 if(template.hook==='damagedAttackPenalty')return '触发：对应武魂启用且生命低于一半。结束：生命恢复至一半或以上，或收起对应武魂。';
 if(template.hook==='soulCostIncrease'||template.hook==='soulPowerDiscount')return '触发：对应武魂启用，确认施放并支付魂力时。未命中也会支付；取消准备不扣费。';
 if(template.hook==='sustainCostIncrease'||template.hook==='sustainDiscount')return '触发：对应武魂启用，持续能力到达下一次维持扣费时。结束：停止维持或收起对应武魂。';
 return '生效：对应武魂启用期间；收起后不再提供此项效果。';
}

/** Read the committed compiler output; never normalize it as a fresh draft. */
export function registeredMartialSoulWritingMeaning(soul:any){
  const compiled=soul?.扩展?.结构化武魂;
  if(!compiled?.baseAction||!Array.isArray(compiled.traits)||!Array.isArray(compiled.weaknesses))throw new Error('已登记武魂缺少完整代码含义');
  const selected=(entries:any[],templates:any[])=>entries.map(entry=>{
    const template=templates.find(t=>t.id===entry.templateId);
    if(!template)throw new Error('已登记武魂含未识别特性');
    return {id:template.id,name:template.name,meaning:martialSoulTraitMeaning(template,entry.parameter)};
  });
  const base=compiled.baseAction;
  return {
    status:'已经登记的武魂能力；基础动作与战斗增益须启用对应武魂。独立空间保留人物与席位，主动操作仍按其具体条件执行。',
    basicAction:abilityWritingMeaning({...base,effectGraph:rules.effects.makeLinearGraph(base.effectSpecs)},'soul'),
    traits:selected(compiled.traits,rules.martialSoul.TRAIT_TEMPLATES),
    weaknesses:selected(compiled.weaknesses,rules.martialSoul.WEAKNESS_TEMPLATES),
    exchanges:rules.exchange.describe(compiled.exchangeContracts??[],'martialSoul'),
    development:{
      explanation:'以下属性与能力方向用于后续魂环发展，不是已经获得的额外技能；已获技能以人物abilities和来源记录为准。',
      attributes:(compiled.attributes??[]).map((a:any)=>({name:a.name,investment:a.investment})),
      channels:(compiled.channels??[]).map((c:any)=>({name:c.name})),
    },
  };
}

/** Read the latest selected draft without confirming it or changing any selections. */
export function martialSoulWritingMeaning(raw:any){
  const soul=rules.martialSoul,draft=soul.normalizeDraft(raw);
  const mode=soul.BASE_ACTION_MODES[draft.baseAction.mode],attribute=soul.ATTRIBUTE_REGISTRY[draft.baseAction.attributeId];
  const base=mode&&attribute&&draft.attributes.some((a:any)=>a.id===attribute.id)?soul.compileBaseAction(draft):null;
  const selected=(entries:any[],templates:any[])=>entries.map(entry=>{
    const template=templates.find(t=>t.id===entry.templateId);
    return {id:template.id,name:template.name,meaning:martialSoulTraitMeaning(template,entry.parameter)};
  });
  return {
    status:'玩家当前选定方案的作用说明；是否完成创建仍由原确认流程决定。',
    basicAction:base?abilityWritingMeaning({...base,effectGraph:rules.effects.makeLinearGraph(base.effectSpecs)},'soul'):null,
    traits:selected(draft.traits,soul.TRAIT_TEMPLATES),
    weaknesses:selected(draft.weaknesses,soul.WEAKNESS_TEMPLATES),
    exchanges:rules.exchange.describe(draft.exchangeContracts??[],'martialSoul'),
    development:{
      explanation:'属性与能力方向影响后续魂环的抽取；它们不是已经获得的额外技能。',
      attributes:draft.attributes.map((a:any)=>({name:soul.ATTRIBUTE_REGISTRY[a.id].name,investment:a.investment})),
      channels:draft.channels.map((id:string)=>({name:soul.CHANNEL_REGISTRY[id].name,effects:soul.CHANNEL_REGISTRY[id].effectIds.map((effectId:string)=>rules.effects.EFFECT_REGISTRY[effectId].displayName)})),
    },
  };
}

/** Current paid capabilities and future directions are separate readings of
 * the same existing draft, never independently stored or granted abilities. */
export function martialSoulDesignAuthority(raw:any){
 const {development,...currentCapabilities}=martialSoulWritingMeaning(raw);
 return {currentCapabilities,futureDirections:development};
}
