import {rules} from '../rules';

type Row = Record<string, any>;
const snakeId = 'preset:canonical-snake';
const silkId = 'preset:silver-shuttle-silk';

function inheritedSnake(soul: Row) {
  const base = soul.扩展?.expressionBase?.definition ?? soul.扩展?.结构化武魂?.definition;
  return base?.presetId === snakeId;
}
function isOriginalSisi(state:Row,soul:Row) {
  const binding=soul.扩展?.canonicalGrowth;
  return binding?.recordId==='si-si' && ['canonical','projection'].includes(binding.mode)
    && state.人物?.列表?.[soul.持有者单位ID]?.扩展?.角色库ID==='si-si';
}
function updateAbsorption(state:Row, ring:Row, skill:Row, result:Row) {
  const op=state.魂环.operations?.[ring.扩展?.absorptionTransactionId];
  if(!op)return;
  const receipt=op.receipt;
  receipt.skillDefinitions=[structuredClone(skill)];
  if(receipt.skillNames)receipt.skillNames=[skill.name];
  if(receipt.effectIdsBySkill)receipt.effectIdsBySkill=[skill.effectGraph.nodes.map((n:Row)=>n.effectId)];
  receipt.budget=structuredClone(result.budget);
  receipt.compatibility={...structuredClone(result.compatibility),ratio:result.budget.compatibility};
  op.receiptHash=rules.abilities.hash(receipt);
  for(const confirm of Object.values(state.魂环.operations) as Row[]){
    if(confirm.kind!=='confirm'||confirm.receipt?.ringId!==ring.id)continue;
    Object.assign(confirm.receipt,structuredClone(receipt));
    confirm.receiptHash=rules.abilities.hash(confirm.receipt);
  }
}

function upgradeSisi(state:Row, old:Row) {
  const owner=old.持有者单位ID, id=old.id, growth=state.成长.列表[owner], unit=state.战斗单位.列表[owner];
  const route=rules.canonicalGrowth.routeFor('si-si').loadout;
  const fresh=rules.foundation.finalizeMartialSoulDraft(rules.presets.request(silkId),{ownerId:owner,id,budget:9999});
  const {expressionBase,expressionHistory,...oldExtensions}=old.扩展;
  fresh.扩展={...oldExtensions,...fresh.扩展};
  fresh.显现状态=old.显现状态;
  state.武魂.列表[id]=fresh;
  const priorPoints=growth.可用属性点;
  const priorHealth=unit.资源.生命.当前, priorPower=unit.资源.魂力.当前;
  for(const ringId of old.魂环ID列表){
    const ring=state.魂环.列表[ringId],ordinal=ring.序号,slot=route.rings[ordinal-1];
    const skillId=ring.魂技ID列表[0],previous=state.技能.列表[skillId];
    const factory=ring.扩展.generatedBy==='registered-history' &&
      (previous?.presetId?.startsWith('canonical:si-si:1:') || (!previous?.presetId&&previous?.扩展?.generatedBy==='registered-history'&&previous?.扩展?.evidence==='mechanical-inference'&&previous.name===previous.扩展.compiledName&&previous.name.startsWith(`蛇·第${ordinal}魂技·`)));
    const signature=previous?.presetId?.startsWith('canonical:si-si:1:');
    const activeSoul=state.武魂.列表[id];
    if(ring.魂技ID列表.length===1&&slot&&(factory||signature)){
      if(factory){
        // Only authored backstory sources can be rebuilt. Keep the original IDs, years,
        // acquisition gates, and already-awarded points even for pre-refinement saves.
        const spec={...structuredClone(slot),profileId:ring.来源魂兽档案ID,years:ring.年限};
        const generatedOp='registered-absorb-'+ringId, oldOp=state.魂环.operations?.[generatedOp];
        if(oldOp)delete state.魂环.operations[generatedOp];
        let rebuilt;
        try{
          rebuilt=rules.world.generateRegisteredRings(state,owner,growth.魂力等级,'sisi-silk:'+id+':'+ordinal,{
            soulLoadouts:[{soulIndex:1,martialSoulId:id,desiredCount:ordinal,rings:[...Array(ordinal-1),spec]}],
            canonicalSkillPreference:true,strictCanonicalPreference:true,allowCanonicalExpressionGrowth:true
          })[0];
        }catch(error){
          if(oldOp)state.魂环.operations[generatedOp]=oldOp;
          throw error;
        }
        if(rebuilt.ringId!==ringId||rebuilt.skillIds[0]!==skillId)throw Error('旧魂环身份与历史登记不符');
        const next=state.魂环.列表[ringId];
        next.吸收双门=ring.吸收双门;next.吸收时快照=ring.吸收时快照;next.永久属性增益=ring.永久属性增益;
        next.扩展={...ring.扩展,...next.扩展};
        if(!state.武魂.列表[id].扩展.expressionHistory?.some((r:Row)=>r.sourceId===generatedOp))delete next.扩展.expressionGrowth;
        continue;
      }
      // A player-hunted beast keeps its own source, budget and absorption transaction.
      const source=state.魂兽档案.列表[ring.来源魂兽档案ID];
      const [preset]=rules.canonicalGrowth.preferredIds(state,activeSoul,ordinal,source);
      const compiled=rules.presets.compile(preset,{martialSoul:activeSoul,beastProfile:source,beastSkills:source.扩展?.能力账本?.skills,ringOrdinal:ordinal,allowExpressionGrowth:true,options:{compatibility:rules.cycle.calculateCompatibility(activeSoul,source,source.扩展?.能力账本?.skills??[]).ratio}});
      if(compiled.pass){
        const result=compiled.mechanics;
        if(result.expressionGrowth)rules.canonicalGrowth.applyExpression(state,activeSoul,result.expressionGrowth,source,ring.扩展.absorptionTransactionId);
        const newSkill=result.skills[0];
        Object.assign(newSkill,{id:skillId,名称:newSkill.name,类型:previous.类型,持有者单位ID:owner,来源武魂ID:id,来源魂环ID:ring.id,来源魂兽档案ID:source.id,蓝图版本:previous.蓝图版本,效果图:structuredClone(newSkill.effectGraph),扩展:{预算:newSkill.budget,契合:newSkill.compatibility,魂力消耗:newSkill.soulPowerCost,不可变哈希:''}});
        state.技能.列表[skillId]=rules.abilities.seal(newSkill);
        ring.扩展.蓝图哈希列表=[newSkill.immutableHash];
        const row=state.武魂.列表[id].扩展.expressionHistory?.find((r:Row)=>r.sourceId===ring.扩展.absorptionTransactionId);
        if(row)ring.扩展.expressionGrowth=structuredClone(row);else delete ring.扩展.expressionGrowth;
        const b=result.budget;
        ring.价值={...ring.价值,潜在点数:b.potential,可用点数:b.available,技能分配:b.allocations,已花费:b.spent,未分配:b.unallocated,表达成长:b.expressionCost??0,总支出:b.totalSpent??b.spent};
        updateAbsorption(state,ring,newSkill,result);
      }
    }
    state.武魂.列表[id].魂环ID列表.push(ringId);
  }
  growth.可用属性点=priorPoints;
  const refreshed=rules.cycle.refreshCombatant(state,owner);
  refreshed.资源.生命.当前=Math.min(priorHealth,refreshed.资源.生命.最大);
  refreshed.资源.魂力.当前=Math.min(priorPower,refreshed.资源.魂力.最大);
}

export function upgradeSisiContent(input:Row):Row {
  const old=(Object.values(input.武魂?.列表??{}) as Row[]).filter(s=>s.名称==='蛇'&&(inheritedSnake(s)||isOriginalSisi(input,s)));
  if(!old.length)return input;
  const state=structuredClone(input);
  for(const key of old){
    const soul=state.武魂.列表[key.id];
    if(isOriginalSisi(state,soul))continue;
    soul.名称='银脊蚀骨蛇';
    for(const ringId of soul.魂环ID列表){
      for(const skillId of state.魂环.列表[ringId].魂技ID列表){
        const skill=state.技能.列表[skillId];
        if(skill?.presetId==='canonical:si-si:1:7'&&skill.name==='灵蛇真身')skill.name=skill.名称='银脊蚀骨真身';
      }
    }
    const binding=soul.扩展.canonicalGrowth;
    if(binding?.mode==='martial-preset'){
      rules.canonicalGrowth.bindSoul(soul,'silver-spine-serpent',1,binding.sourceId,'martial-preset');
      soul.扩展.canonicalGrowth.presetId=snakeId;
    }else rules.canonicalGrowth.bindPresetSoul(soul);
  }
  const original=old.filter(s=>isOriginalSisi(state,s));
  if(original.length){
    const before=rules.expedition.validateCurrentRuntimeState(state);
    if(!before.pass)throw Error('旧存档未通过校验：'+before.errors.join('；'));
    for(const soul of original)upgradeSisi(state,state.武魂.列表[soul.id]);
  }
  return state;
}
