import {rules} from '../rules';
import {abilityEffectName,modifierPresentation} from './ability-text';
import {effectProse} from './effect-prose';
import {restraintPresentation} from './restraint-presentation';
import {exchangeLines} from './exchange-presentation';
import {ABILITY_KIND_LABELS} from './ability-sources';

/** Describe the fixed host contract; runtime adjustments do not rewrite this definition. */
export function hostAbilityWritingMeaning(input:any){
 const definition=rules.host.normalize(input),c=definition.capabilities,lines:string[]=[];
 if(c.durability)lines.push(({normal:'器具可正常损坏',indestructible:'器具不可破坏', 'rule-only':'普通方法不能破坏器具，特殊破坏须满足已登记合同'} as Record<string,string>)[c.durability.mode]);
 if(c.release)lines.push(c.release.wearerLock?'穿戴者不能直接自行解除，解除须按器具控制权与实际锁具规则处理':'解除按实际器具权限处理');
 if(c.suppression)lines.push(`魂力初始抑制${c.suppression.percent}%，控制者可在0至100%之间调节；允许能力类别为${c.suppression.kinds.map((kind:string)=>ABILITY_KIND_LABELS[kind]??kind).join('、')||'无'}，最高魂环阶为${c.suppression.maxRank}；其他独立封印仍取严`);
 if(c.binding)lines.push(`覆盖方式为${({cover:'覆盖',partial:'局部拘束',full:'全身拘束'} as Record<string,string>)[c.binding.mode]}，身法减值${c.binding.agilityPenalty}`);
 if(c.forms)lines.push(`可使用登记器具形态，同一运行态最多六个部位条目，调整耗时${c.forms.changeMinutes}分钟；当前固定初始配置不限制后续登记形态选择范围`);
 if(c.appearance)lines.push(`可选外观为${c.appearance.presets.join('、')}，初始为${c.appearance.current}，切换耗时${c.appearance.changeMinutes}分钟；纯外观不附加战斗收益`);
 return {definition,summary:lines.join('；')+'。'};
}

/** A reading of the compiled graph, never a second compiler or a battle prediction. */
export function abilityWritingMeaning(skill:any,source:'soul'|'device'|'soul-device'|'beast'|'consumable'|'hidden-weapon'|'bone'='soul') {
  const paid=skill.confirmedDesign?rules.paidDesign.quote(skill.confirmedDesign.category,skill.confirmedDesign):null;
  const fixedHost=skill.host??skill.hostDesign?.definition?.host??paid?.payload.host,host=fixedHost?hostAbilityWritingMeaning(fixedHost):null;
  // This is only the registered base identity for the existing presentation.
  // The authored structure is still verified from the actual compiled payload.
  const restraint=skill.restraint??(paid?.payload.backgroundRestraint?{kind:'registered-restraint',templateId:paid.templateId,contractHash:rules.abilities.hash(rules.custody.DEVICES[paid.templateId])}:null);
  const restraintView=restraint?restraintPresentation(restraint,paid?{templateId:paid.templateId,payload:paid.payload}:undefined):null;
  const graph=skill.effectGraph??(skill.effectSpecs?.length?rules.effects.makeLinearGraph(skill.effectSpecs):null);
  if(restraintView&&(!paid||!graph?.nodes?.length))return {activation:'实物装配',summary:restraintView.conditions+(host?'；'+host.summary:''),parts:[],restraint:restraintView,...(host?{host}:{}),usage:{soulPowerCost:0,cooldownTurns:0}};
  const deviceSource=source==='device'||source==='soul-device';
  if((deviceSource||host)&&!graph?.nodes?.length){
    const stats=modifierPresentation(skill.modifiers,{},{}).map(x=>`${x.label}${x.value}`);
    if(!stats.length&&!host)throw new Error('装备缺少有效属性或被动');
    return {activation:stats.length?'装备属性':'宿主装配',summary:(stats.length?`装备时常驻获得${stats.join('，')}，卸下后失效。`:'')+(host?.summary??''),parts:[],equipmentBenefits:stats,...(host?{host}:{}),usage:{soulPowerCost:0,cooldownTurns:0}};
  }
  if(!graph?.nodes?.length)throw new Error('能力尚无完整效果，无法生成机械说明');
  const activation=rules.effects.skillActivation(graph);
  if(source==='device'&&activation!=='passive')throw new Error('装备不能含有主动技能');
  const branches=rules.effects.graphBranches(graph);
  const passiveCondition={soul:'对应武魂启用时',device:'装备这件器物时','soul-device':'装备这件魂导器时',beast:'魂兽自身的这项能力有效时',consumable:'此物品的被动效果有效时','hidden-weapon':'这件暗器的被动效果有效时',bone:'对应魂骨的这项能力有效时'}[source];
  const parts=branches.map((branch:any,index:number)=>{
    const passive=branch.activation==='passive';
    const nodes=branch.nodes;
    const target=nodes.find((n:any)=>n.effectId.startsWith('target.'));
    const release=nodes.find((n:any)=>n.effectId.startsWith('release.'));
    const check=nodes.find((n:any)=>n.effectId.startsWith('check.'));
    const scoped={...skill,effectGraph:{...graph,nodes,branches:[]}};
    // Reuse the engine's definition of beneficial skills for automatic allegiance.
    const beneficial=rules.combat.isBeneficialSkill(scoped);
    const faction=target?.params?.阵营规则??'自动';
    const subject=passive||target?.effectId==='target.self'?'自身':
      faction==='友方'?'友方目标':faction==='敌方'?'敌方目标':
      faction==='任意'||faction==='无差别'?'目标（不区分敌我）':
      beneficial?'友方目标':'敌方目标';
    const shape:Record<string,string>={
      'target.single':'一名','target.cluster':'落点附近一小群','target.line':'前方直线范围内的',
      'target.cone':'前方锥形范围内的','target.burst':'指定圆形区域内的',
      'target.aura':'施展时自身周围的','target.chain':'依次连锁的',
    };
    const targetText=subject==='自身'?'自身':`${shape[target?.effectId]??''}${subject}`;
    const rawDelivery=passive?`${passiveCondition}，这部分对自身常驻生效，无需施放`:
      release?.effectId==='release.touch'?'接触施展':release?.effectId==='release.melee'?'近身施展':
      release?.effectId==='release.projectile'?'向外释放力量':'主动施展';
    const delivery=!passive&&source==='soul-device'?`装备这件魂导器后，${rawDelivery}`:rawDelivery;
    const halfEffects=nodes.filter((n:any)=>['payload.damage','payload.drain'].includes(n.effectId));
    const resistedEffects=nodes.filter((n:any)=>! /^(release|target|check|sustain)\./u.test(n.effectId)&&!halfEffects.includes(n));
    const saved=check?.params?.成功效果==='伤害减半'&&halfEffects.length?
      `抵抗成功时，只承受减半的即时伤害${resistedEffects.length?`，${resistedEffects.map((n:any)=>abilityEffectName(n.effectId,{})).join('、')}不生效`:''}`:'抵抗成功时本部分不生效';
    const selfVoluntary=subject==='自身'&&resistedEffects.length>0&&resistedEffects.every((n:any)=>rules.effects.EFFECT_REGISTRY[n.effectId]?.selfApplication==='voluntary');
    const condition=passive?'':selfVoluntary?'本人主动采用这套仪容，无须抵抗自己的伪装':beneficial&&(subject==='自身'||subject==='友方目标')?'对同阵营的纯增益直接生效，不进行命中或豁免判定':check?.effectId==='check.save'?
      `目标以${check.params?.属性??'指定属性'}尝试抵抗。抵抗失败时本部分效果生效；${saved}`:
      check?`通过${abilityEffectName(check.effectId,{})}后，本部分效果生效；未命中则不生效`:
      '本部分没有命中或豁免判定，仍遵守目标合法性和实际防护';
    const meanings=nodes.filter((n:any)=>! /^(release|target|check)\./u.test(n.effectId)).map((node:any)=>{
      const output=rules.combat.effectOutputProfile(node,passive?{outputScale:1}:skill);
      const p=output.displayParams;
      const dice=p.骰数!=null&&p.骰面!=null?`${p.骰数}d${p.骰面}${p.加值?`${p.加值>0?'+':''}${p.加值}`:''}`:'';
      const formula=dice&&output.amountScale!==1?`(${dice}) × ${output.amountScale}`:dice;
      let details=effectProse(node.effectId,p,formula,{}).join('，');
      if(node.effectId==='passive.equipment_stat')return {effectId:node.effectId,meaning:rules.foundation.EQUIPMENT_AFFIXES.meaning(p.属性,p.数值)};
      if(node.effectId==='passive.element_amplify')return {effectId:node.effectId,damageType:p.类型,percent:p.数值,meaning:`装备时自身造成的${p.类型}属性生命伤害提高${p.数值}%，包括该属性直接伤害与持续伤害；只提高匹配的伤害段，在目标抗性和减伤之前生效。卸下后停止作用于新攻击；已施加的持续伤害保留当时的增幅。`};
      const name=node.effectId==='status.resistance_shift'?`${p.类型}属性${p.模式}`:abilityEffectName(node.effectId,{});
      if(node.effectId==='status.resistance_shift'){
        details=details.replaceAll(`${p.类型}伤害`,`${p.类型}属性伤害`);
        if(p.模式==='易伤')details=`目标${details}`;
      }
      const action:Record<string,string>={
        'realm.capture':'在战后或场外主动收押，将原人物收入所属独立空间并绑定永久席位',
        'realm.deploy':`召唤第${p.席位}席已经绑定的人物出战`,
        'payload.damage':'造成即时伤害','payload.residual':'造成即时伤害','payload.drain':'造成伤害并将一部分转为施术者生命',
        'payload.shield':'获得抵挡伤害的临时护盾','payload.heal':'恢复生命',
        'status.burn':'施加灼烧，后续回合持续造成火焰伤害','status.poison':'施加中毒，后续回合持续造成毒素伤害',
        'status.bind':'束缚目标的移动','status.slow':'降低目标速度','status.regeneration':p.持续方式==='世界分钟'?'后续每世界分钟持续恢复生命':'后续回合持续恢复生命',
        'status.mind_control':'按声明命令域施加精神控制，不改变客观阵营与关系','status.soul_control':'按声明命令域施加灵魂控制，不改变客观阵营与关系','status.cognition_shift':'按真实进度改变人物主观认知，不改写客观经历','status.mute':'阻止发声，仅限制要求发声的能力','status.limb_bind':'拘束指定肢体，仅限制对应动作条件','status.power_seal':`封住目标的${p.封印对象==='精细'?'所选能力':p.封印对象}，作用范围为${p.范围}`,
        'copy.skillset':'让受术者借用另行选定的另一名人物的部分技能，复制来源与受术者分别选择',
        'status.battle_resource':'按照逐条触发规则积累本场蓄能',
        'payload.resource_damage':'消费对应蓄能，增加本次攻击的伤害',
        'payload.resource_endstate':'攻击和反应结束后承担相应资源终值，命中与否均会承担',
        'transform.sex':'改变目标的实际身体性别与相应外貌',
        'transform.disguise':'按已付模板改变仪容；实际身体、数值与武魂保留，识破不自动解除来源或获知真名',
      };
      const recipient=node.effectId==='payload.resource_endstate'?(p.承担者==='本体'?'本体':'施术者'):['move.pursuit','move.approach'].includes(node.effectId)?'施术者':subject;
      return {effectId:node.effectId,params:p,recipient,meaning:`${action[node.effectId]??name}${details?`（${details}）`:''}`};
    });
    // Cone length is its own actual area; a longer projectile range must not enlarge it.
    // A self target stays self even if its stored allegiance is friendly.
    const geometry=passive||subject==='自身'?[]:[target?.effectId==='target.cone'?null:release,target].filter(Boolean).flatMap(n=>effectProse(n.effectId,n.params??{},'',{}));
    const domain=nodes.find((n:any)=>n.effectId==='domain.field');
    const statement=`${branch.optional?'可选部分：':''}${delivery}${passive?'':`，作用于${targetText}`}${geometry.length?`（${geometry.join('，')}）`:''}。${condition?condition+'。':''}`+
      (domain?'建立领域；领域内附属效果按领域指定的时机、范围和阵营触发，不作为一次直接攻击同时结算。':'')+
      meanings.map((m:any)=>m.meaning).join('；')+'。';
    return {part:index+1,activation:passive?'常驻被动':'主动',optional:branch.optional,recipient:subject,effects:meanings,statement,
      notes:[]};
  });
  const equipmentBenefits=deviceSource?modifierPresentation(skill.modifiers,{},{}).map(x=>`${x.label}${x.value}`):[];
  return {
    activation:activation==='hybrid'?'主动与常驻被动并存':activation==='passive'?'常驻被动':'主动',
    summary:(skill.targetConditions?'使用对象须满足：'+rules.targetConditions.describe(skill.targetConditions)+'。\n':'')+(restraintView?restraintView.conditions+'\n':'')+parts.map((p:any)=>p.statement).join('\n')+(host?'\n'+host.summary:''),parts,...(host?{host}:{}),...(restraintView?{restraint:restraintView}:{}),
    ...(equipmentBenefits.length?{equipmentBenefits:`装备时额外获得：${equipmentBenefits.join('，')}；卸下后失效。`}:{}),
    usage:{...rules.combat.skillUsageRules(skill),soulPowerCost:activation==='passive'?0:Number(skill.soulPowerCost??0),cooldownTurns:activation==='passive'?0:Number(skill.cooldownTurns??0),...(source==='soul-device'?{durabilityCost:activation==='passive'?0:Number(skill.durabilityCost??0)}:{}),...(skill.exchangeContracts?.length?{...(skill.id?{contract:rules.abilities.describe(skill)}:{}),exchanges:exchangeLines(skill)}:{})},
  };
}

/** Read a formally compiled item source; pure equipment keeps the passive-only assertion. */
export function researchAbilityWritingSource(category:string,mechanics:any):'device'|'soul-device'|'consumable'|'hidden-weapon'{
 if(category==='拘束器'&&mechanics.confirmedDesign&&mechanics.sourceKind==='soul-device')return 'soul-device';
 return category==='魂导器'?(mechanics.sourceKind==='soul-device'?'soul-device':'device'):['丹药','毒药'].includes(category)?'consumable':'hidden-weapon';
}
