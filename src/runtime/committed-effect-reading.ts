/** Shared reading of already compiled outcomes. It does not evaluate effects. */
const fieldLabels:Record<string,string>={realmId:'所属空间',slotId:'收容席位',custodyId:'看管记录',regionId:'居住庭院',summary:'已发生的经过',hpDamage:'生命伤害结算',remainingHp:'效果后生命',damageType:'伤害属性',shieldUsed:'护盾承担',equipmentReduction:'装备减伤',nonlethalPrevented:'非致死保护挡下',nonlethal:'非致死',temporaryHpBefore:'原有护盾',temporaryHp:'效果后护盾',offeredAmount:'提供护盾',shieldOffered:'提供护盾',absorbedAsShield:'转为护盾',amount:'实际数值',remainingSoulPower:'效果后魂力',lifeRestored:'恢复生命',soulPowerRestored:'恢复魂力',drainHealing:'实际汲取恢复',casterRemainingHp:'施术者生命',statusId:'状态实例',remainingRounds:'剩余回合',previousRemainingRounds:'原剩余回合',layers:'层数',triggered:'已触发',refreshed:'已刷新',removed:'已移除'};
/** Compact action feedback. Identifiers and proof objects remain in the original facts. */
export function playerOutcomeReading(o:any):string{
 const v=o.value??{};
 if(o.kind==='誓约安装结果')return '本次誓约节点已安装，最终成立情况见契约回执';
 if(['已收入独立空间并永久绑定','已收入限时独立空间'].includes(o.kind))return v.summary;
 if(o.kind==='追击次数变化')return `本次凝聚${v.charges}次追击`;
 if(o.kind==='本次合流消费')return `本次收束剩余追击${v.consumed}次`;
 if(o.kind==='本次蓄能攻击消费')return `消耗全部${v.consumed}份蓄能，其中${v.credited}份计入本次攻击`;
 if(o.kind==='命中后的抵抗结果')return `命中后的抵抗${v.resisted?'成功，未受干扰':'失败，下一次相应检定受到干扰'}`;
 if(o.kind==='化身实际分配魂力')return `本体实际分配${v.soulPowerTransfer.total}点魂力，每具化身获得${v.soulPowerTransfer.perUnit}点`;
 if(o.kind==='战斗维持期限')return '维持至本场战斗结束，仍须继续供魂';
 if(o.kind==='器具操作结果'){const actions:Record<string,string>={'device.unlock':'解锁','device.suppress-lock':'暂时压制锁效','device.break-rule':'按规则破坏器体','device.analyze-lock':'解析锁结构','device.create-key':'制造实体钥匙','device.arcane-lock':'施加有期限的魔法锁'};return `${actions[v.type]??'器具操作'}${v.success?'成功':'未成功'}${v.damage?`，器体耐久${v.damage.before}→${v.damage.after}`:''}${v.check?`（检定${v.check.total}，难度${v.check.dc}）`:''}`;}
 if(o.kind==='器具操作执行来源')return '本次操作沿用实际能力与付款来源';
 if(o.kind==='装备实际修复')return `${v.itemName}耐久 ${v.durabilityBefore} → ${v.durabilityAfter} / ${v.maxDurability}`;
 if(o.kind==='永久造物实际交付')return `已制造${v.productName} × ${v.quantity}，存入行囊`;
 if(o.kind==='构造实际材料消耗')return `消耗${v.consumedValue}点材料价值`;
 if(o.kind==='墙体实际损耗')return `墙体耐久 ${v.wallDamage.durabilityBefore} → ${v.wallDamage.durabilityAfter}${v.wallDamage.destroyed?'，已被破坏':''}`;
 if(o.kind==='世界构造期限')return `构造持续至世界第${v.expiresAt}分钟${v.durability!==undefined?`，耐久${v.durability}`:''}`;
 if(o.kind==='未生效原因')return v.prevented?typeof v.prevented==='string'?`未生效：${v.prevented}`:'未能生效':'';
 if(o.kind==='拘束逐层解除结果')return (v.removedLayers??[]).map((r:any)=>`拘束${r.before}层 → ${r.after}层`).join('；');
 if(o.kind==='伤害防护结算'){const r=v.resistance;return r?`${r.type}伤害${r.mode}，剩余伤害${r.finalAmount}`:'伤害防护已生效';}
 if(o.kind==='已解除的状态与区域')return `解除${(v.removedStatusIds??[]).length}项状态、${(v.removedZoneIds??[]).length}处区域效果`;
 if(o.kind==='召唤出的单位及继承技能')return `召出${(v.summonedUnitIds??[]).length}名助战者`;
 if(o.kind==='实际复制的技能')return `复制了${(v.copiedSkillIds??[]).length}项魂技`;
 if(o.kind==='已被打断的技能')return '打断了对方的魂技';
 if(o.kind==='复活结果')return v.revived?'已复活':'未能复活';
 if(o.kind==='实际位置变化')return '位置已改变';
 if(o.kind==='施放前实际追击')return v.reached?'已靠近到施放距离':'靠近后仍未进入施放距离';
 if(o.kind==='领域实例结果')return `领域已展开${v.state?`，当前${v.state}`:''}${v.durationMode==='来源维持'?'，由来源持续维持':v.remainingRounds!==undefined?`，剩余${v.remainingRounds}回合`:''}`;
 const labels={...fieldLabels,hpDamage:'造成生命伤害',amount:o.kind.replace(/^实际/u,''),lockedSoulPower:'占用魂力',upkeep:'每回合消耗魂力',requestedLockedSoulPower:'所需占用魂力'};
 const parts=Object.entries(v).filter(([k,value])=>k!=='statusId'&&Object.hasOwn(labels,k)&&value!==undefined&&value!==null&&typeof value!=='object').map(([k,value])=>`${labels[k as keyof typeof labels]} ${typeof value==='boolean'?(value?'是':'否'):value}`);
 if(parts.length)return parts.join('，');
 if(o.kind==='状态实例变化')return '状态已生效';
 if(o.kind==='区域实例结果')return '区域效果已展开';
 if(o.kind==='实际变化的武魂形态来源')return '武魂形态已改变';
 return o.kind.replace(/实际|实例|登记|结算/gu,'');
}
export function committedOutcomeReading(o:any,identifiers:(value:any)=>any=value=>value):string{
  if(!o.value||typeof o.value!=='object'||Array.isArray(o.value))return `${o.kind}：${JSON.stringify(o.value)}`;
  const values=identifiers(o.value);
  if(['器具操作结果','器具操作执行来源','装备实际修复','永久造物实际交付','构造实际材料消耗','墙体实际损耗','世界构造期限'].includes(o.kind))return playerOutcomeReading({...o,value:values});
  if(o.kind==='施放前实际追击'){const p=(v:any)=>v.战场坐标?`(${v.战场坐标.x},${v.战场坐标.y})`:v.距离区??'原位置';return `施放前追击：从${p(values.from)}到${p(values.to)}，实际移动距离${values.distance}（上限${values.maximumDistance}）；${values.reached?'已进入目标触及范围':'仍未进入目标触及范围'}。`; }
  if(o.kind==='拘束逐层解除结果')return `${o.kind}：${values.removedLayers.map((v:any)=>`${v.statusId}，${v.before}层→${v.after}层`).join('；')}`;
  if(o.kind==='生命伤害结算'&&Number.isFinite(values.hpDamage)&&values.hpDamage>=0
   &&Object.keys(values).every(key=>['hpDamage','remainingHp','damageType','shieldUsed','equipmentReduction','nonlethalPrevented','nonlethal'].includes(key))){
   // Read the settled consequence, rather than asking the author to equate
   // a successful hit, pre-protection damage and life actually damaged.
   const parts=[values.hpDamage===0?'本次没有造成生命伤害（0）':`本次结算生命伤害${values.hpDamage}`];
   if(values.damageType!==undefined)parts.push(`伤害属性${values.damageType}`);
   if(values.shieldUsed!==undefined)parts.push(`护盾实际承担${values.shieldUsed}`);
   if(values.equipmentReduction)parts.push(`装备实际减伤${values.equipmentReduction}`);
   if(values.nonlethalPrevented)parts.push(`非致死保护挡下${values.nonlethalPrevented}`);
   if(values.nonlethal===true)parts.push('按非致死处理');
   if(values.remainingHp!==undefined)parts.push(`结算后生命${values.remainingHp}`);
   return parts.join('，');
  }
  if(o.kind==='伤害防护结算'){
   const r=values.resistance,known=['type','sources','rawAmount','finalAmount','mode','penetration','multiplier','absorbed'];
   if(r&&Object.keys(r).every(k=>known.includes(k)))return `伤害抗性：${r.type}·${r.mode}，处理后${r.finalAmount}${r.absorbed?`，吸收${r.absorbed}`:''}${r.penetration?`，穿透${r.penetration}`:''}${r.sources?.length?`，来源${JSON.stringify(r.sources)}`:''}`;
  }
  const noEventFields=new Set(['equipmentReduction','nonlethalPrevented','absorbedAsShield','shieldOffered','nonlethal']);
  const selected=Object.entries(values).filter(([key,value])=>!noEventFields.has(key)||value!==0&&value!==false);
  // A zero-only result still says something definite. Do not leave an empty
  // "shield change" heading which could be read as an unreported new effect.
  const entries=selected.length?selected:Object.entries(values);
  return `${o.kind}：`+entries.map(([key,value])=>`${fieldLabels[key]??key}=${typeof value==='object'?JSON.stringify(value):value===true?'是':value===false?'否':value}`).join('，');
 }
