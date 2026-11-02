import displayLabels from '../shared/display-labels.json';
import {displayNames} from '../shared/display-names';
import {authoredDescription} from './player-copy';
import {deviceOperationOutcome} from '../shared/device-operation-display';
import {competitionDisplayText} from '../shared/competition-display';
import {materialAppearance} from '../shared/material-appearance';
import '../shared/person-presentation-core.js';


const INTERNAL_TEXT = /(?:\b(?:undefined|NaN|mechanicsHash|effectGraph|sourceKind|candidateId|snapshot|className|function|const|JSON|LLM)\b|\[object Object\]|待命名(?:魂兽|魂技|材料|物品|武魂|道具)|注册池|冻结机械|机械候选|代码终审|代码.{0,48}(?:预算|冻结|生成)|程序组合魂技|测试魂兽|生态测试兽|测试兽技|^\s*[{[]|<\/?(?:script|div|span|html)\b)/iu;

const INTERNAL_TOKEN = /\b(?:loc-|wuhun-|soul-|canon-|exp-|expedition-|research-|item-|beast-|skill-|status-|receipt-|profile-|ring-|battle-|container-|wallet-)[a-z0-9_.:-]+\b|\b[a-z]+\.[a-z][a-z0-9_.-]*\b/giu;


/** Only registered labels and player prose cross this text boundary. IDs stay in structured data. */
export function playerText(rawInput: unknown, state: any, fallback = '这项操作暂时无法完成，请返回当前旅程重试'): string {
  if (typeof rawInput !== 'string' || !rawInput.trim()) return fallback;
  let input=rawInput;
  // Seeing a revealed body does not disclose a name. Also cover raw combat
  // receipts and source labels, which legitimately retain internal identities.
  const viewer=state?.角色?.主控单位ID;
  if(viewer)for(const person of Object.values(state?.人物?.列表??{}) as any[]){
    const secret=person.扩展?.身份呈现?.actualName;
    if(person.id!==viewer&&secret&&input.includes(secret)){
      const visible=(globalThis as any).SoulPersonPresentation.presentation(state,person.id,viewer);
      if(visible.identityHidden)input=input.replaceAll(secret,visible.name);
    }
  }
  if(/^(?:叙事对象包含未开放字段|叙事对象资料格式不完整|叙事提案含有未支持的字段或对象结构|主持人必须完整引用玩家全部原话)/u.test(input))return '这次故事安排未能完成，请重试本次行动。你的输入已保留。';
  if(input==='导入文件不是有效JSON')return '文件格式无法读取，请重新选择或粘贴完整文件。当前旅程未被替换。';
  if(/存档未通过规则校验|存档.*(?:哈希|指纹|校验和).*(?:不一致|失败)/u.test(input))return '这份存档无法完整读取，请选择其他备份。现有旅程已保留。';
  if(/浏览器存储事务/u.test(input))return '这次保存尚未完成，请稍后重试。';
  const soulPower=input.match(/魂力不足[：，]\s*(?:施放)?需要(\d+)并额外锁定(\d+)(?:，可用(\d+))?/u);
  if(soulPower)return `魂力不足：需要${soulPower[1]}点魂力${Number(soulPower[2])>0?`，另需保留${soulPower[2]}点维持效果`:''}${soulPower[3]!==undefined?`，目前可用${soulPower[3]}点`:''}。`;
  const named:string=competitionDisplayText(authoredDescription(displayNames.presentGeneratedNames(input.replace(/^Error:\s*/u,'').trim()))).replace(/机制补全·/gu,'').replace(/战斗数值修正/gu,'能力强化或削弱').replaceAll('看管','关押');
  const normalized=named.replace(/\b(R16|QF|SF|F)(?=[:：])/g,code=>(displayLabels.rounds as Record<string,string>)[code]??'本轮');
  INTERNAL_TOKEN.lastIndex=0;
  const hasToken=INTERNAL_TOKEN.test(normalized);
  INTERNAL_TOKEN.lastIndex=0;
  if (!hasToken) return INTERNAL_TEXT.test(normalized)||/规则选择|冻结(?:机械|候选|结果)|模型只负责|(?:代码|系统)终审|机械(?:预算|指纹)|^[\s\S]*\n\s*at\s+[\w.]+\s*\(/u.test(normalized) ? fallback : normalized.slice(0,800);
  const labels = new Map<string,string>(Object.entries(displayLabels.labels));
  const collections = [state?.人物?.列表,state?.战斗单位?.列表,state?.武魂?.列表,state?.技能?.列表,state?.魂环?.列表,
    state?.物品?.实例,state?.地图?.地点];
  for (const collection of collections) for (const [id,item] of Object.entries(collection ?? {}) as Array<[string,any]>) {
    const label=String(item?.displayName ?? item?.name ?? item?.名称 ?? '');
    if (label && label !== id) labels.set(id,label);
  }
  let text=normalized;
  text=text.replace(INTERNAL_TOKEN, token => labels.get(token) ?? '相关对象').replace(/机制补全·/gu,'').replace(/战斗数值修正/gu,'能力强化或削弱').replaceAll('看管','关押');
  if (INTERNAL_TEXT.test(text)) return fallback;
  return competitionDisplayText(text.slice(0,800));
}


/** Describe unnamed/legacy material from its recorded properties without changing its identity. */
export function materialName(material:any,state:any):string {
  if(!material)return '已耗尽材料';
  const named=playerText(material.displayName,state,'');
  if(named&&!/相关对象|category\./u.test(named)&&!/category\./u.test(material.displayName??''))return named;
  const attribute=Object.entries(material.attributeSpectrum ?? {}).filter(([name,value])=>displayLabels.attributes.includes(name)&&Number(value)>0).sort((a,b)=>Number(b[1])-Number(a[1]))[0]?.[0];
  const part=materialPartName(material,state);
  return attribute ? `${attribute}属性·${part}` : part;
}

/** Read-only form label shared by material cards and story context. */
export function materialPartName(material:any,state:any):string {
  return playerText(materialAppearance.part(material?.appearancePart||material?.categories?.[0],(token,fallback)=>(displayLabels.labels as Record<string,string>)[token]??(/^[a-z]+(?:[._-][a-z0-9-]+)+$/i.test(token)?fallback:token)),state,'魂质结晶');
}


/** Old generated abilities can lack a player name. Describe their recorded
 * soul/effect without renaming or recompiling anything in the saved rules. */
export function skillName(skill:any,state:any,fallback='魂师能力'):string {
  if(!skill)return fallback;
  const court=(globalThis as any).SoulNineCourts?.ofSkill(skill);if(court)return court.name;
  const named=playerText(skill.name??skill.名称,state,'');if(named)return named;
  const source=state?.武魂?.列表?.[skill.sourceMartialSoulId??skill.来源武魂ID];
  const soul=playerText(source?.名称,state,'');
  const nodes=skill.effectGraph?.nodes??skill.效果图?.nodes??[];
  const labels:Record<string,string>={'payload.heal':'回生','payload.shield':'守御','payload.soul_restore':'凝息','payload.restore':'复苏','payload.damage':'魂击','payload.drain':'汲生','payload.residual':'余威','status.buff':'振灵','status.bind':'缠缚','status.root':'缠缚'};
  const node=nodes.find((node:any)=>labels[node.effectId]);
  const effect=node?labels[node.effectId]:fallback;
  return soul?`${soul}·${effect}`:effect;
}


const ACTION_RESULTS: Record<string,string> = {
  'player.create':'角色创建完成，你的旅程开始了',
  'martial-soul.draft-start':'武魂构想已保存','martial-soul.draft-update':'武魂方案已更新','martial-soul.draft-confirm':'武魂方案已确认',
  'ring.prepare-choice':'魂技方案已准备好，请选择心仪的一套','ring.prepare-from-beast':'魂技方案已准备好，请选择心仪的一套','ring.name-choices':'魂技名称与介绍已更新',
  'ring.confirm-choice':'魂环吸收完成，新的魂技已经掌握','ring.absorb':'魂环吸收完成','ring.condense':'魂环已凝聚',
  'ring.item.prepare':'魂环的魂技方案已准备好','ring.item.name-source':'魂环的来历已记入旅途',
  'ring.replace-preset':'已免费换成随机魂技方案',
  'ring.reroll':'已换成一套新的魂技方案','research.reroll':'已换成一份新的作品方案',
  'research.begin':'材料已投入，作品方案已保留','research.resolve':'作品方案已准备好，请选择心仪的一件',
  'research.choose':'新作品与图纸已收入行囊','blueprint.craft':'作品制造完成',
  'title.register':'封号候选已准备好','title.confirm':'新的封号已经铭刻',
  'expedition.resolve-narrative':'前方景象已展开','expedition.harvest':'魂兽材料已收取','expedition.harvest-many':'所选魂兽材料已收取',
  'expedition.enter':'已抵达下一处地点',
  'expedition.open-chest':'宝箱中的材料已收入此行收获，安全撤离后带回',
};


export function receiptSummary(commandType: string, receipt: Record<string,any>, state: any): string {
  if(receipt.type==='field-ability-used'||receipt.type?.startsWith('device.')){
    const outcomes=[receipt,...(receipt.targets??[]).flatMap((target:any)=>target.effects??[])].map(deviceOperationOutcome).filter(Boolean);
    if(outcomes.length)return [...new Set(outcomes)].join('；');
  }
  if(['party-message-sent','person-heard-statement','relationship-ended','commitment-proposed','commitment-responded','commitment-completed'].includes(receipt.type)&&typeof receipt.summary==='string')return playerText(receipt.summary.split(/[；;]/)[0],state,'已记录');
  if(receipt.type==='solo-competition-created')return `已报名${playerText((displayLabels.venueNames as Record<string,string>)[receipt.venueId],state,'斗魂赛事')} · ${receipt.competitionLevel}级组，赛程已建立。`;
  if(receipt.type==='solo-competition-match-resolved'){
    if(receipt.status==='between-rounds')return '本场获胜，已晋级下一轮。可以继续参赛。';
    const placements:Record<string,string>={champion:'冠军',runner_up:'亚军',semifinalist:'四强',quarterfinalist:'八强',round_of_16:'十六强'};
    const placement=placements[receipt.placement];
    const result=placement?`本届成绩：${placement}。`:'本届比赛已结束。';
    const reward=receipt.reward;
    return result+(reward?`${reward.newBest?'刷新本组最佳。':''}获得${reward.gold??0}金币、${reward.experience??0}经验，奖品已结算。`:'可以查看赛果并继续旅程。');
  }
  if (receipt.type === 'combat-action') {
    const actor=playerText(state?.战斗单位?.列表?.[receipt.actorId]?.名称,state,'行动者');
    const action=receipt.skill?skillName(state?.技能?.列表?.[receipt.skill.id]??receipt.skill,state,'行动'):playerText(receipt.actionType,state,'行动');
    const facts=(receipt.narrationFacts ?? []).map((text: unknown) => playerText(text,state,'')).filter(Boolean);
    for(const target of receipt.targets??[]){
      const name=playerText(state?.战斗单位?.列表?.[target.targetId]?.名称,state,'目标');
      if(target.check?.hit===false)facts.push(`${actor}未命中${name}`);
      for(const effect of target.effects??[]){
        const deviceOutcome=deviceOperationOutcome(effect);if(deviceOutcome)facts.push(deviceOutcome);
        if(effect.effectId==='payload.heal')facts.push(`${name}恢复${effect.amount}点生命`);
        if(effect.effectId==='payload.shield')facts.push(`${name}新增${effect.amount}点护盾`);
        if(effect.effectId==='payload.soul_restore')facts.push(`${name}恢复${effect.amount}点魂力`);
        if(effect.effectId==='payload.soul_damage')facts.push(`${name}损失${Math.abs(effect.amount)}点魂力`);
        if(effect.effectId==='payload.restore')facts.push(`${name}恢复${effect.lifeRestored}点生命、${effect.soulPowerRestored}点魂力`);
        if(effect.drainHealing!==undefined)facts.push(`${actor}汲取${effect.drainHealing}点生命`);
      }
    }
    for(const tick of receipt.statusEvents??[]){
      if(typeof tick.hpDamage!=='number')continue;
      const amp=tick.elementAmplification,name=playerText(state?.战斗单位?.列表?.[tick.targetId]?.名称,state,'目标');
      const type=playerText(tick.damageType??tick.resistance?.type??amp?.damageType,state,'');
      facts.push(`${name}受到${tick.hpDamage}点${type}持续伤害`+(amp?.percent?`；施加时${amp.sources.map((source:any)=>playerText(source.name,state,'装备')).join('、')}提供${amp.percent}%增幅，抗性结算前增加${amp.gain}点`:''));
    }
    const opening=receipt.skill ? `${actor}施展「${action}」` : `${actor}：${action}`;
    return [opening,...new Set(facts)].join('；');
  }
  const fallback=ACTION_RESULTS[commandType] ?? '行动已完成';
  if (ACTION_RESULTS[commandType]) return fallback;
  return playerText(receipt.summary,state,fallback);
}
