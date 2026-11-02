import {castReceiptLabel} from './ability-sources';
import display from '../shared/display-labels.json';
import {playerText} from './player-text';
import {hitInterferenceReading} from './hit-interference-reading';
import {battleResourceOutcomeReading} from './battle-resource-reading';

export interface BattleJudgment {title:string;lines:string[]}
const signed=(value:number)=>value<0?`− ${Math.abs(value)}`:`+ ${value}`;
const present=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value);

/** Display only the committed receipt. Never roll again or consult current combat stats. */
export function battleAdjudication(receipt:Record<string,any>,state:any):BattleJudgment[] {
  const sections:BattleJudgment[]=[];
  const text=(value:unknown,fallback='')=>playerText(value,state,fallback);
  const unit=(id:string)=>text(state.战斗单位?.列表?.[id]?.名称,'战场单位');
  const effectName=(id:string)=>text((display.labels as Record<string,string>)[id],'效果');
  const sources=(items:any[]=[])=>[...new Set(items.map(item=>text(item.name,'能力防护')))].join('、');
  const add=(title:string,lines:string[])=>{if(lines.length)sections.push({title,lines});};
  const diceLine=(dice:any)=>dice?.rolls?.length
    ? `${dice.count}d${dice.sides} 骰点：${dice.rolls.join('、')}，合计 ${dice.total}`
    : dice&&present(dice.total)?`固定数值：${dice.total}`:'';
  const checkLines=(check:any):string[]=>{
    if(!check)return [];
    if(check.type==='automatic-beneficial')return ['友方纯增益，直接生效，无需命中或豁免检定。'];
    const interference=hitInterferenceReading(check,{arithmetic:true});
    if(!present(check.die))return interference;
    const label=check.type==='attack'?'命中检定':check.type==='save'?`${text(check.attribute)}豁免`:check.type==='break-free'?`${text(check.attribute)}挣脱`:check.type==='counter'?'反制检定':'撤离检定';
    const mode=check.mode==='advantage'?'优势，取较高值':check.mode==='disadvantage'?'劣势，取较低值':'普通掷骰';
    const lines=[`${label} · ${mode}`,`d20：${(check.rolls??[check.die]).join('、')}；采用 ${check.die}`,`${check.die} ${signed(check.modifier)} = ${check.total}`,...interference];
    if(check.modifierSources?.length)lines.push(`加值来源：${check.modifierSources.map((source:any)=>`${text(source.name,'能力')} ${signed(source.value)}`).join('；')}`);
    if(check.type==='attack'){
      lines.push(`目标${text(check.defenseType,'')}防御 ${check.defense} → ${check.hit?'命中':'未命中'}`);
      if(check.armorBreak||check.armorPenetration)lines.push(`破甲 ${check.armorBreak??0}，护甲穿透 ${check.armorPenetration??0}；已计入目标防御。`);
      if(check.natural20)lines.push(check.critical?'自然20：本次命中并造成重击，伤害骰翻倍（下方已计入）。':check.hit?'自然20：本次命中。':'自然20：本次最终未命中。');
      else if(check.natural1)lines.push(check.hit?'自然1：本次最终命中。':'自然1：本次未命中。');
    } else {
      const pass=check.saved??check.success;
      lines.push(`难度 ${check.dc} → ${pass?'成功':'失败'}`);
      if(check.die===20)lines.push('自然20：检定必定成功。');
      else if(check.die===1)lines.push('自然1：检定必定失败。');
      if(check.type==='save'&&check.saved)lines.push(check.successEffect==='伤害减半'?'豁免成功：本次伤害减半。':'豁免成功：抵挡本次效果。');
      if(check.statusGuardSources?.length)lines.push(`豁免优势来源：${sources(check.statusGuardSources)}`);
    }
    return lines;
  };
  const damageLines=(damage:any):string[]=>{
    const lines:string[]=[];
    const dice=diceLine(damage.dice);if(dice)lines.push(dice);
    const bonuses:[string,string][]=[['baseBonus','技能固定加值'],['scaling','属性与能力加值'],['avatarOutputBonus','武魂真身'],['upcastBonus','升环增幅'],['damageBuff','伤害增益']];
    for(const [key,label] of bonuses)if(present(damage[key])&&damage[key]!==0)lines.push(`${label} ${signed(damage[key])}`);
    for(const [key,label] of [['saveMultiplier','豁免伤害系数'],['grazeMultiplier','失手擦伤系数'],['outputScale','技能威力系数'],['deliveryScale','攻击方式系数'],['expeditionCombatScale','魂兽输出系数']])if(present(damage[key])&&damage[key]!==1)lines.push(`${label} ×${damage[key]}`);
    const amp=damage.elementAmplification;
    if(amp)lines.push(`${text(amp.damageType,'对应')}属性伤害增幅 +${amp.percent}%：${amp.before} → ${amp.amount}（增加 ${amp.gain}）`, `增幅来源：${sources(amp.sources)}`);
    else if(present(damage.rawAmount))lines.push(`抗性前伤害：${damage.rawAmount}（已结算加值、系数与取整）`);
    const resistance=damage.resistance;
    if(resistance){
      lines.push(`${text(resistance.type,'对应')}属性 · ${text(resistance.mode,'正常')}：${resistance.rawAmount} → ${resistance.finalAmount}`);
      if(resistance.sources?.length)lines.push(`防护来源：${sources(resistance.sources)}`);
      if(resistance.penetration)lines.push(`抗性穿透 ${resistance.penetration} 档（不能穿过免疫）`);
    }
    if(damage.equipmentReduction)lines.push(`装备固定减伤：${damage.equipmentReduction}`);
    if(damage.shieldUsed)lines.push(`护盾抵扣：${damage.shieldUsed}`);
    if(damage.absorbedAsShield||resistance?.mode==='吸收')lines.push(`吸收后实际增加护盾：${damage.absorbedAsShield??0}（取较高护盾，不累加）`);
    if(damage.nonlethalPrevented)lines.push(`非致命效果保留生命，免除伤害：${damage.nonlethalPrevented}`);
    if(present(damage.hpDamage))lines.push(`生命伤害：${damage.hpDamage}${present(damage.remainingHp)?`；剩余生命 ${damage.remainingHp}`:''}`);
    return lines;
  };
  const effectLines=(effect:any):string[]=>{
    if(effect.resistance||present(effect.hpDamage))return damageLines(effect);
    const lines:string[]=[];const name=effectName(effect.effectId);
    if(effect.prevented)lines.push(`${name}未生效：${text(effect.prevented,'被抵挡')}${effect.sources?.length?`（${sources(effect.sources)}）`:''}`);
    if(effect.durationMode==='来源维持')lines.push(`${name}生效：持续维持，停止供魂、失能或战斗结束时解除`);
    else if(present(effect.remainingRounds))lines.push(`${name}${effect.refreshed?'刷新':'生效'}：持续 ${effect.remainingRounds} 回合${effect.layers?`，${effect.layers} 层`:''}`);
    if(effect.removed)lines.push(`${name}已解除。`);
    if(effect.counteredSkillId)lines.push('反制成功，本次技能被打断。');
    if(effect.removedStatusIds?.length)lines.push(`解除状态 ${effect.removedStatusIds.length} 个。`);
    if(present(effect.amount)&&!effect.resistance){const dice=diceLine(effect.dice);if(dice)lines.push(dice);lines.push(`${name}实际数值：${effect.amount}`);}
    if(present(effect.temporaryHp))lines.push(`原护盾 ${effect.temporaryHpBefore}，本次提供 ${effect.offeredAmount} → 最终护盾 ${effect.temporaryHp}（取较高值）`);
    if(present(effect.lifeRestored))lines.push(`实际恢复生命 ${effect.lifeRestored}，剩余 ${effect.remainingHp}`);
    if(present(effect.soulPowerRestored))lines.push(`实际恢复魂力 ${effect.soulPowerRestored}，剩余 ${effect.remainingSoulPower}`);
    if(present(effect.remainingHp)&&!present(effect.lifeRestored))lines.push(`剩余生命 ${effect.remainingHp}`);
    return lines;
  };
  const cast=castReceiptLabel(receipt);
  if(cast)add('技能来源与施法环阶',[cast,...(receipt.skill.upcastBonus>0?['本次升环数值总增幅：+'+receipt.skill.upcastBonus+'；多段与多目标共同分摊。']:[])]);
  const resources=receipt.resources?.actorSoulPower;
  if(resources)add('魂力消耗',[`${resources.before} − ${resources.spent} = ${resources.after}`]);
  if(receipt.movement){const move=receipt.movement;add('行动前移动',[`${text(move.from?.距离区)} → ${text(move.to?.距离区)}，移动 ${move.distance} 个距离区${move.dash?'（冲刺）':''}`]);}
  if(receipt.escape){const escape=receipt.escape;add('撤离判定',[...checkLines({...escape,type:'escape'}),`追击者：${unit(escape.pursuerId)}；距离修正 ${signed(escape.zoneModifier)}，接战惩罚 ${signed(escape.engagedPenalty)}，路线修正 ${signed(escape.routeModifier)}`,`队友协助 ${signed(escape.assistBonus)}，武魂特性 ${signed(escape.traitBonus??0)}（已计入检定加值）`]);}
  for(const target of receipt.targets??[]){
    const lines=[...checkLines(target.counter?{...target.counter,type:'counter'}:null),...checkLines(target.check)];
    for(const effect of target.effects??[])lines.push(...effectLines(effect));
    if(!lines.length)lines.push(target.affected?'本次效果直接结算，无额外掷骰。':'本次效果未生效。');
    add(`目标 · ${unit(target.targetId)}`,lines);
    for(const effect of target.effects??[])if(effect.reflection)add(`反伤 · ${unit(receipt.actorId)}`,damageLines({...effect.reflection,rawAmount:effect.reflection.reflectedRaw}));
  }
  for(const event of receipt.statusEvents??[]){
    // Domain triggers are also emitted as target receipts; show their adjudication once.
    if(event.event==='domain-trigger')continue;
    const titles:Record<string,string>={'burn':'烧伤','poison':'中毒','dot':'持续伤害','hazard-tick':'区域伤害','eternal-wound':'持续创伤','regeneration':'再生','domain-effect':'领域效果'};
    const lines=[...checkLines(event.check),...effectLines(event)];
    for(const effect of event.effects??[])lines.push(...effectLines(effect));
    if(lines.length)add(`${titles[event.event]??'状态结算'} · ${unit(event.targetId)}`,lines);
  }
  add('本次蓄能与发动后代价',battleResourceOutcomeReading(receipt,unit));
  if(!sections.length)add('行动结果',['本次行动没有命中、豁免或伤害掷骰。']);
  return sections;
}
