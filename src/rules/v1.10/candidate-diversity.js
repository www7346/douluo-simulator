(function attachCandidateDiversity(root, factory) {
  const narrative=root?.SoulNarrative ?? (typeof require==='function'?require('./narrative-core.js'):null);
  const equipment=root?.SoulEquipmentAffixes ?? (typeof require==='function'?require('./equipment-affixes.js'):null);
  const api = factory(narrative,equipment);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SoulCandidateDiversity = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createCandidateDiversity(narrative,equipment) {
  'use strict';
  const stable = value => JSON.stringify(value, (_, v) => v && !Array.isArray(v) && typeof v === 'object'
    ? Object.fromEntries(Object.keys(v).sort().map(k => [k,v[k]])) : v);
  const numericKeys = new Set(['每人次数','投影比例','每回合上限','容量','每层骰数','每层加值','最低层数','最大计入层数','魂力分配','继承环序上限','同源伤害增幅百分比','同源射程增幅','召唤技能效果倍率','精神防护加值','等级','次数','擦伤比例','数值','持续分钟','持续回合','距离区','最大目标','半径区','跳跃区','最大数量','层数','生命百分比','修复量','价值上限','最大数量','转化百分比','穿透档','护甲穿透','命中加值','难度加值']);
  const categoricalKeys = new Set(['真身调遣','资源槽','事件槽','事件规则','归属','检定','抵抗属性','命中后抵抗','承担者','本人优先','落点','离散缩放','继承技能ID','类型','持续方式','来源依赖','模式','防护对象','属性','目的','类别','阵营规则','选择模式','领域阵营','生命模式','魂力模式']);
  const isShell = id => /^(release|target|check|sustain)\./u.test(id);
  const mean = p => Number(p.骰数) > 0 ? Number(p.骰数)*(Number(p.骰面)+1)/2+Number(p.加值??0) : Number(p.数值??0);
  function skillProfile(skill, registry) {
    const graph=skill.effectGraph??{nodes:(skill.frozenEffectSpecs??skill.effectSpecs??[]).map(([effectId,params])=>({effectId,params}))};
    const nodes=graph.nodes??[], metrics={}, purposes=[], shapes=[], facts=[];
    // A self-only timed defense cannot count as a different role from the same
    // permanent defense. Compare its actual duration, costs and equipment stats.
    const selfDefense=nodes.some(n=>!isShell(n.effectId)) && nodes.every(n=>isShell(n.effectId)?n.effectId==='target.self':(['status.resistance_shift','status.status_guard'].includes(n.effectId)&&n.params?.模式!=='易伤')) && !(graph.branches??[]).some(branch=>branch.optional);
    let unknown=false;
    const maxOutput=Math.max(0,...nodes.filter(n=>/^payload\./u.test(n.effectId)).map(n=>mean(n.params??{})));
    const add=(key,value,eligible=true)=>{if(Number.isFinite(Number(value)))metrics[key]={value:Number(value),eligible};};
    const occurrences={};
    for(const node of nodes){
      const id=node.effectId,p=node.params??{},definition=registry[id];
      if(!definition){unknown=true;continue;}
      // A branch may alter whether/where an effect runs. Do not infer equivalence
      // from a bag of node labels when its control flow has not been modelled.
      const branch=(graph.branches??[]).find(branch=>branch.nodeIds?.includes(node.id));
      if ((graph.branches??[]).some(branch=>!['active','passive'].includes(branch.activation ?? 'active'))) unknown=true;
      const semantic=Object.fromEntries(Object.entries(p).filter(([key])=>categoricalKeys.has(key)));
      if (['status.resistance_shift','status.status_guard'].includes(id) && p.模式!=='易伤') delete semantic.模式;
      const condition={targetPolicy:branch?.targetPolicy??'auto',optional:branch?.optional===true};
      if(selfDefense&&isShell(id))continue;
      if(id==='status.buff')semantic.polarity=Number(p.数值)<0?'negative':'positive';
      const token=(selfDefense?'self-defense':(branch?.activation ?? 'active')+':'+stable(condition))+':'+id+':'+stable(semantic),ordinal=occurrences[token]??0;occurrences[token]=ordinal+1;
      const key=token+':'+ordinal;
      if(selfDefense&&branch?.activation==='passive')add(key+':持续回合',Number.MAX_SAFE_INTEGER);
      if (['status.resistance_shift','status.status_guard'].includes(id) && p.模式!=='易伤') add(key+':defense-rank',({抗性:1,免疫:2,吸收:3}[p.模式] ?? 0));
      const smallPayload=/^payload\.(damage|heal|shield)$/u.test(id)&&mean(p)<maxOutput*.1;
      const smallBuff=id==='status.buff'&&Math.abs(Number(p.数值??0))<2&&nodes.some(n=>!isShell(n.effectId)&&n.effectId!=='status.buff');
      const significant=!smallPayload&&!smallBuff;
      if(!isShell(id)&&significant)purposes.push(token);
      if(/^(release|target)\./u.test(id))shapes.push(token);
      if(p.骰数!=null)add(key+':output',mean(p)*Number(skill.outputScale??1),significant);
      for(const [parameter,value] of Object.entries(p))if(numericKeys.has(parameter)){
        // Raw check bonuses are monotone, but are NOT probabilities. They may
        // establish dominance, never supply a 25% gameplay difference alone.
        add(key+':'+parameter,id==='status.buff'&&parameter==='数值'?Math.abs(Number(value)):value,significant&&!/^check\./u.test(id));
      }
      if(!isShell(id)||/^(release|target)\./u.test(id)){
        const details=[];
        if(p.骰数!=null)details.push(`基础期望${Math.round(mean(p)*Number(skill.outputScale??1)*10)/10}`);
        if(p.类型)details.push(p.类型);
        if(p.属性)details.push(p.属性);
        if(p.防护对象)details.push(registry[p.防护对象]?.displayName ?? p.防护对象);
        if(p.模式)details.push(p.模式);
        if(branch?.activation==='passive')details.push('被动，来源有效时常驻');
        for(const [parameter,label] of [['等级','规则等级'],['次数','次数'],['擦伤比例','擦伤比例%'],['距离区','距离'],['最大目标','至多目标'],['持续回合','持续'],['数值','数值']])
          if(p[parameter]!=null)details.push(`${label}${p[parameter]}${parameter==='持续回合'?'回合':parameter==='距离区'?'区':''}`);
        facts.push(definition.displayName+(details.length?' · '+details.join(' · '):''));
      }
    }
    if(skill.medicine){shapes.push('medicine:'+stable({route:skill.medicine.route}));add('medicine-doses',skill.medicine.doses);add('medicine-source-duration',skill.medicine.sourceDurationMinutes);}
    add('soul-cost',-Number(skill.soulPowerCost??0));add('cooldown',-Number(skill.cooldownTurns??0));
    for(const [key,value] of Object.entries(skill.modifiers?.attributes??{}))add('attribute:'+key,value);
    for(const [key,value] of Object.entries(skill.modifiers?.attributes??{}))if(Number(value))facts.push(`装备时${key} +${value}`);
    if(skill.disposable!=null)add('uses',skill.disposable?1:Math.max(1,Math.floor(Number(skill.durability??100)/Math.max(1,Number(skill.durabilityCost??0)))));
    if(skill.disposable===true)facts.push('使用后消耗一件');
    else if(Number(skill.durabilityCost)>0)facts.push(`可使用${Math.floor(Number(skill.durability)/Number(skill.durabilityCost))}次`);
    // Prove containment for simple self-benefits even when the added benefit
    // changes the purpose signature. Never infer it for costs, hostile effects,
    // optional branches, attack/save differences, or unmodelled control flow.
    const equipmentBenefits=skill.category==='魂导器'&&nodes.every(n=>['passive.equipment_stat','passive.element_amplify','status.resistance_shift','status.status_guard'].includes(n.effectId)&&n.params?.模式!=='易伤')&&!(graph.branches??[]).some(b=>b.optional||b.activation!=='passive');
    const monotoneSelfBenefits=equipmentBenefits||nodes.some(n=>n.effectId==='target.self')&&nodes.every(n=>
      n.effectId==='target.self'||['payload.heal','payload.shield','payload.soul_restore','payload.cleanse'].includes(n.effectId)||
      n.effectId==='status.buff'&&Number(n.params?.数值)>0||
      ['status.resistance_shift','status.status_guard'].includes(n.effectId)&&n.params?.模式!=='易伤')&&
      !(graph.branches??[]).some(branch=>branch.optional||branch.activation==='passive')&&
      !(graph.edges??[]).some(edge=>(graph.edges??[]).filter(other=>other.from===edge.from).length>1);
    return {purpose:stable([...new Set(purposes)].sort()),shape:stable(shapes.sort()),metrics,unknown,facts,monotoneSelfBenefits,
      soulPowerCost:Number(skill.soulPowerCost??0),cooldownTurns:Number(skill.cooldownTurns??0)};
  }
  function describe(candidate,registry){return (candidate.skills??[candidate]).map(skill=>skillProfile(skill,registry));}
  function compareSkill(a,b){
    if(a.unknown||b.unknown)return {different:false,dominance:0,reason:'unmodelled-control-flow'};
    if(a.purpose!==b.purpose||a.shape!==b.shape){
      if(a.monotoneSelfBenefits&&b.monotoneSelfBenefits&&a.shape===b.shape){
        const left=JSON.parse(a.purpose),right=JSON.parse(b.purpose);
        const noWorse=(x,y)=>[...new Set([...Object.keys(x.metrics),...Object.keys(y.metrics)])].every(key=>(x.metrics[key]?.value??0)>=(y.metrics[key]?.value??0));
        if(right.every(token=>left.includes(token))&&noWorse(a,b))return {different:false,dominance:1,reason:'benefit-superset'};
        if(left.every(token=>right.includes(token))&&noWorse(b,a))return {different:false,dominance:-1,reason:'benefit-superset'};
      }
      return {different:true,dominance:0,reason:'purpose'};
    }
    let better=false,worse=false,majorBetter=false,majorWorse=false;
    for(const key of new Set([...Object.keys(a.metrics),...Object.keys(b.metrics)])){
      const left=a.metrics[key]??{value:0,eligible:true},right=b.metrics[key]??{value:0,eligible:true};
      const delta=left.value-right.value;
      if(Math.abs(delta)<1e-8)continue;
      if(delta>0)better=true;else worse=true;
      const scale=Math.min(Math.abs(left.value),Math.abs(right.value));
      const major=left.eligible&&right.eligible&&Math.abs(delta)>=Math.max(1,scale*.25);
      if(major){if(delta>0)majorBetter=true;else majorWorse=true;}
    }
    return {different:majorBetter&&majorWorse,dominance:better&&!worse?1:worse&&!better?-1:0,
      reason:majorBetter&&majorWorse?'tradeoff':better!==worse?'dominated':'similar'};
  }
  function compareProfiles(a,b){
    // Match whole packages, independent of display order. One genuinely changed
    // role makes a new package; changing IDs, ordering, or a tiny value does not.
    if(a.length!==b.length){
      const left=new Set(a.map(s=>s.purpose)),right=new Set(b.map(s=>s.purpose));
      return {different:[...left].some(x=>!right.has(x))||[...right].some(x=>!left.has(x)),dominance:0,reason:'package-purpose'};
    }
    let match=null;
    function visit(index,used,relations){
      if(index===a.length){match=relations;return true;}
      for(let j=0;j<b.length;j++)if(!used.has(j)){
        const relation=compareSkill(a[index],b[j]);if(relation.different)continue;
        if(visit(index+1,new Set([...used,j]),[...relations,relation]))return true;
      }
      return false;
    }
    if(!visit(0,new Set(),[]))return {different:true,dominance:0,reason:'package-tradeoff'};
    const signs=match.map(r=>r.dominance);
    return {different:false,dominance:signs.some(x=>x>0)&&signs.every(x=>x>=0)?1:signs.some(x=>x<0)&&signs.every(x=>x<=0)?-1:0,reason:match[0]?.reason??'similar'};
  }
  function compare(a,b,registry){return compareProfiles(describe(a,registry),describe(b,registry));}
  function select(pool,count,excluded,registry){
    const profiles=pool.map(c=>describe(c,registry)), exclusions=(excluded??[]).map(c=>describe(c,registry));
    let eligible=pool.map((_,i)=>i).filter(i=>exclusions.every(other=>compareProfiles(profiles[i],other).different));
    const relations=new Map();
    const relation=(i,j)=>{const key=i+':'+j;if(!relations.has(key))relations.set(key,compareProfiles(profiles[i],profiles[j]));return relations.get(key);};
    eligible=eligible.filter(i=>!eligible.some(j=>j!==i&&relation(i,j).dominance<0));
    let best=[],bestRoles=0;
    const roleKey=i=>stable(profiles[i].map(s=>[s.purpose,s.shape]).sort());
    // At most 72 candidates and four slots. Ordered backtracking chooses a
    // largest compatible subset without allowing an early near-duplicate to
    // prevent a valid three-way choice. A deterministic work bound caps cost.
    let visits=0;
    function search(chosen,remaining){
      if(++visits>20000)return false;
      const roles=new Set(chosen.map(roleKey)).size;
      if(chosen.length>best.length||(chosen.length===best.length&&roles>bestRoles)){best=chosen;bestRoles=roles;}
      if(best.length>=count&&bestRoles>=count)return true;
      if(chosen.length>=count)return false;
      for(let p=0;p<remaining.length;p++){
        if(chosen.length+remaining.length-p<best.length)break;
        const i=remaining[p],rest=remaining.slice(p+1).filter(j=>relation(i,j).different);
        if(search([...chosen,i],rest))return true;
      }
      return false;
    }
    search([],eligible);
    return best.map(i=>pool[i]);
  }
  function facts(candidate,registry){return describe(candidate,registry).map(s=>({effects:s.facts,soulPowerCost:s.soulPowerCost,cooldownTurns:s.cooldownTurns}));}
  function uniqueNames(names,candidates,registry,limit=18,mutable=names.map((_,i)=>i)){
    const result=[...names],changeable=new Set(mutable),seen=new Set(names.filter((_,i)=>!changeable.has(i)));
    for(let i=0;i<names.length;i++)if(changeable.has(i)){
      let name=names[i];
      if(seen.has(name)){
        const candidate=candidates[i],skill=candidate.skills?.[0]??candidate;
        const label=narrative.skillNarrative(skill);
        name=narrative.distinctName(name,label.names,seen,limit);
      }
      result[i]=name;seen.add(name);
    }
    return result;
  }
  const ROLE_LABELS=Object.freeze({...equipment.ROLE_LABELS,contract:'灵魂誓约',...Object.fromEntries(['力量','身法','体魄','悟性','感知','意志'].map(key=>['attribute:'+key,key+'强化'])),'element-defense':'属性防护','status-defense':'状态防护',damage:'直接伤害',erosion:'持续侵蚀',control:'行动控制',defense:'生存防护',recovery:'恢复续战',enhance:'强化增幅',weaken:'削弱破防',movement:'机动转移',counter:'净化反制',summon:'召唤变身',creation:'永久造物',analysis:'信息分析'});
  const ROLE_EFFECTS=Object.freeze({
    contract:['contract.oath','trigger.contract'],
    damage:['payload.death','payload.damage','payload.residual','payload.soul_damage','payload.drain','payload.stack_confluence','payload.resource_damage'],
    erosion:['status.damage_over_time','status.burn','status.poison','status.eternal_wound','zone.hazard'],
    control:['payload.arcane_lock','realm.store','realm.capture','status.bind','status.paralysis','status.stun','status.fear','status.charm','status.blind','status.silence','status.mute','status.limb_bind','status.power_seal','status.mind_control','status.soul_control','status.cognition_shift','status.sleep','status.slow','intimate.climax','move.knockback','move.pull','zone.wall','zone.obscure'],
    defense:['payload.shield','status.invisibility','status.invulnerable','status.status_guard','status.evasion_reroll','status.absolute_evasion','status.critical_guard'],
    creation:['payload.fabricate','payload.create_key'],analysis:['payload.analyze_lock'],
    recovery:['payload.repair_item','payload.heal','payload.soul_restore','payload.restore','payload.revive','status.regeneration'],
    enhance:['copy.skillset','modifier.next_skill','domain.field','status.hit_advantage','status.hit_reroll','status.sure_hit','status.critical_guarantee','status.miss_graze','status.limited_followup','status.battle_resource'],
    weaken:['status.armor_break','status.mark','status.desire','intimate.stimulate','status.hit_disadvantage','status.next_check_penalty'],
    movement:['move.step','status.haste','move.teleport','move.flight','move.pursuit','move.approach'],
    counter:['payload.unlock','payload.suppress_lock','payload.rule_break','payload.cleanse','payload.dispel','reaction.counter','reaction.reflect','payload.zone_dispel','payload.resource_endstate'],
    summon:['realm.deploy','summon.entity','transform.form','transform.martial_avatar','transform.sex','transform.disguise']
  });
  function effectRole(id,params={}){
    if(id==='status.amplify')return ['伤害减免','物理防御','魂技防御','护盾'].includes(params.指标)?'defense':'enhance';
    if(isShell(id))return 'shell';
    if(id==='modifier.world_duration')return 'enhance';
    if(['modifier.hit_advantage','modifier.hit_reroll','modifier.sure_hit','modifier.critical_guarantee','modifier.miss_graze'].includes(id))return 'damage';
    if(id==='passive.equipment_stat')return equipment.REGISTRY[params.属性]?.role??'enhance';
    if(id==='passive.element_amplify')return 'element-amplify';
    if(id==='status.resistance_shift')return params.模式==='易伤'?'weaken':'defense';
    if(id==='status.buff')return params.属性==='移动区'?'movement':['物理防御','魂技防御'].includes(params.属性)?'defense':'enhance';
    return Object.keys(ROLE_EFFECTS).find(role=>ROLE_EFFECTS[role].includes(id))??null;
  }
  // Prices describe functional investment, independent of names, elements,
  // target geometry and casting shells. Optional branches cannot establish a role.
  function strongProfile(candidate,costForNode){
    const totals={},guaranteed={};let invalid=false;
    const skills=(candidate.skills??[candidate]).map(skill=>{
      const graph=skill.effectGraph;
      const isEquipment=skill.category==='魂导器'&&skill.sourceKind!=='soul-device';
      if(!graph?.nodes?.length&&!isEquipment){invalid=true;return null;}
      const values={},core={};
      for(const node of isEquipment?equipment.mergedEquipmentNodes(graph):graph?.nodes??[]){
        let role=isEquipment?(node.effectId==='passive.equipment_stat'?equipment.REGISTRY[node.params.属性]?.role:node.effectId==='passive.element_amplify'?'element-amplify':node.effectId==='status.resistance_shift'?'element-defense':node.effectId==='status.status_guard'?'status-defense':null):effectRole(node.effectId,node.params);
        const branch=(graph.branches??[]).find(b=>b.nodeIds?.includes(node.id)||b.id===node.branchId),branchNodes=graph.nodes.filter(n=>branch?branch.nodeIds?.includes(n.id)||n.branchId===branch.id:true);
        if(branchNodes.some(n=>n.effectId==='contract.oath')&&!isShell(node.effectId))role='contract';
        else if(node.effectId==='modifier.world_duration'){const next=branchNodes[branchNodes.indexOf(node)+1];role=effectRole(next?.effectId,next?.params);}
        if(!role){invalid=true;continue;}if(role==='shell')continue;
        if(branch&&!['active','passive'].includes(branch.activation??'active'))invalid=true;
        if(isEquipment&&branch?.activation!=='passive')invalid=true;
        const cost=Math.max(0,Number(costForNode(node.effectId,node.params??{},{activation:branch?.activation??'active'})));
        if(!Number.isFinite(cost)){invalid=true;continue;}
        values[role]=(values[role]??0)+cost;
        if(!branch?.optional)core[role]=(core[role]??0)+cost;
      }
      const attributes=Math.max(0,Number(skill.valueLedger?.costs?.permanentAttributes??0));
      if(attributes){
        if(isEquipment){
          const stats=Object.entries(skill.modifiers?.attributes??{}),points=stats.reduce((sum,[,v])=>sum+Number(v),0);
          for(const [key,value] of stats){const role='attribute-build',cost=attributes*Number(value)/points;values[role]=(values[role]??0)+cost;core[role]=(core[role]??0)+cost;}
        }else{values.enhance=(values.enhance??0)+attributes;core.enhance=(core.enhance??0)+attributes;}
      }
      const total=Object.values(values).reduce((a,b)=>a+b,0);
      const main=Object.keys(core).sort((a,b)=>core[b]-core[a]||a.localeCompare(b))[0];
      const residual=total===0&&graph?.nodes?.some(n=>n.effectId==='payload.residual')&&graph.nodes.every(n=>isShell(n.effectId)||n.effectId==='payload.residual');
      const authored=globalThis.SoulPresetCatalog?.get(skill.presetId)?.catalogKind==='canonical';
      const valid=Boolean(main)&&(total>0&&(core[main]>=total*.6||authored)||residual);
      for(const [role,value] of Object.entries(values))totals[role]=(totals[role]??0)+value;
      for(const [role,value] of Object.entries(core))guaranteed[role]=(guaranteed[role]??0)+value;
      return {main,label:ROLE_LABELS[main],values,total,share:total?core[main]/total:0,valid};
    });
    const total=Object.values(totals).reduce((a,b)=>a+b,0);
    const main=Object.keys(guaranteed).sort((a,b)=>guaranteed[b]-guaranteed[a]||a.localeCompare(b))[0];
    if(candidate.category==='魂导器'&&candidate.sourceKind!=='soul-device'){
      const kind=equipment.formsFor(candidate,costForNode)[0]?.kind;
      const labels={武器:'攻击强化',防具:'防护强化',饰品:'元素增幅与防护',手套:'攻防兼备'};
      return {valid:!invalid&&Boolean(kind)&&total>0,main:kind,label:labels[kind],values:totals,total,skills};
    }
    return {valid:!invalid&&skills.every(s=>s?.valid),main,label:ROLE_LABELS[main],values:totals,total,skills};
  }
  function compareStrong(a,b,costForNode){
    const left=strongProfile(a,costForNode),right=strongProfile(b,costForNode);
    const shared=Object.keys(left.values).reduce((sum,role)=>sum+Math.min(left.values[role],right.values[role]??0),0);
    const overlap=Math.min(left.total,right.total)>0?shared/Math.min(left.total,right.total):1;
    const equipmentPair=a.category==='魂导器'&&b.category==='魂导器';
    return {different:left.valid&&right.valid&&left.main!==right.main&&overlap<.5,overlap,left,right};
  }
  function selectStrong(pool,count,excluded,registry,costForNode){
    let eligible=pool.filter(c=>strongProfile(c,costForNode).valid&&(excluded??[]).every(other=>compareStrong(c,other,costForNode).different));
    eligible=eligible.filter(c=>!eligible.some(other=>other!==c&&compare(c,other,registry).dominance<0));
    // Prefer complete multi-skill packages when they can coexist with the
    // requested number of distinct choices; search still maximizes choice count.
    eligible.sort((a,b)=>(b.skills?.length??1)-(a.skills?.length??1));
    const profiles=eligible.map(c=>strongProfile(c,costForNode));
    const compatible=(i,j)=>{
      const a=profiles[i],b=profiles[j];
      const shared=Object.keys(a.values).reduce((s,r)=>s+Math.min(a.values[r],b.values[r]??0),0);
      const equipmentPair=eligible[i].category==='魂导器'&&eligible[j].category==='魂导器';
      return a.main!==b.main&&shared<Math.min(a.total,b.total)*.5&&compare(eligible[i],eligible[j],registry).dominance===0;
    };
    let best=[],visits=0;
    function visit(chosen,remaining){
      if(++visits>20000)return false;
      if(chosen.length>best.length)best=chosen;
      if(best.length>=count)return true;
      for(let p=0;p<remaining.length;p++){
        if(chosen.length+remaining.length-p<=best.length)break;
        const i=remaining[p];
        const next=[...chosen,i];
        if(eligible[i].category==='魂导器'&&!equipment.assignForms(next.map(k=>eligible[k]),excluded,costForNode))continue;
        if(visit(next,remaining.slice(p+1).filter(j=>compatible(i,j))))return true;
      }return false;
    }
    visit([],eligible.map((_,i)=>i));
    return best.map(i=>({...eligible[i],choiceRole:{id:profiles[i].main,label:profiles[i].label}}));
  }
  return Object.freeze({describe,compare,select,facts,uniqueNames,ROLE_LABELS,effectRole,strongProfile,compareStrong,selectStrong});
});
