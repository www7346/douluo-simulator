import {rules} from '../rules';
import {playerText,skillName,materialName} from './player-text';
import {exchangeLines} from './exchange-presentation';
import {deviceLockLabel,deviceOperationKey} from '../shared/device-operation-display';

function costLine(state:any,fee:any):string {
  if(fee.kind==='soulPower')return `魂力 ${fee.amount}`;
  if(fee.kind==='health')return `生命 ${fee.amount}`;
  if(fee.kind==='lifespan')return `寿命 ${fee.amount} 分钟${fee.sacrificial?'（允许耗尽献祭）':''}`;
  return `${state.物品?.实例?.[fee.itemId]?.name??rules.world.ITEM_TEMPLATES[fee.templateId]?.name??fee.templateId??fee.itemId} × ${fee.quantity}`;
}
function costReason(state:any,reason:string):string {
  return playerText(reason.replace(/物品代价不足：(.+?)需要/g,(_match,id)=>`物品代价不足：${state.物品?.实例?.[id]?.name??rules.world.ITEM_TEMPLATES[id]?.name??'所需物品'}需要`),state);
}

function publicCaptureQuote(state:any,skill:any,branchIds:string[],targetId:string,quote:any){const actorId=state.角色?.主控单位ID,appearance=rules.disguise.presentation(state,targetId,actorId);return targetId!==actorId&&appearance.disguised&&!appearance.seenThrough&&rules.residentRealms.isCaptureSkill(skill,branchIds)?{...quote,available:false,reason:'暂无法确认这副仪容下是否符合收入条件；需要进一步辨认。'}:quote;}

/** Current owned casting sources, shared by the UI and action host; no state ledger is added. */
export function personalMaintenanceOptions(state:any,actorId=state.角色?.主控单位ID){
 const entries=(Object.values(state.扩展?.abilityMaintenance??{}) as any[]).filter(entry=>entry.actorId===actorId);
 const quotes=entries.length?rules.world.previewFieldIntents(state,entries.map(entry=>({type:'stop-maintenance',actorId,maintenanceSourceId:entry.id}))):[];
 return entries.map((entry,index)=>{
  const quote=quotes[index],costs=structuredClone(rules.combat.maintenanceCosts(state,entry));
  const constructs=rules.creation.constructs(state).filter((r:any)=>r.sourceId===entry.id&&r.status==='active').map((r:any)=>{const u=state.战斗单位.列表[r.unitId];return {id:r.id,kind:r.kind,name:r.kind==='wall'?'元素屏障':playerText(u?.名称,state,'召唤实体'),minutesRemaining:Math.max(0,r.expiresAt-rules.people.now(state)),durability:r.zone?.耐久??null,hp:u?.资源?.生命?.当前??null,maxHp:u?.资源?.生命?.最大??null};});
  return {maintenanceSourceId:entry.id,actorId:entry.actorId,skillId:entry.skillId,skillName:skillName(state.技能.列表[entry.skillId]??{name:entry.skillId},state),
   status:'maintaining' as const,constructs,scope:entry.scope,battleId:entry.battleId||null,sourceMartialSoulId:entry.sourceMartialSoulId||null,
   createdAt:entry.createdAt,nextAt:entry.nextAt,minutesUntilNext:Math.max(0,entry.nextAt-rules.people.now(state)),payments:entry.payments??0,
   requirements:structuredClone(entry.requirements??[]),costs,costLines:costs.map((fee:any)=>costLine(state,fee)),available:quote.available,reason:quote.available?'':costReason(state,quote.reason??''),
   action:{kind:'stop-maintenance' as const,maintenanceSourceId:entry.id}};
 });
}

function personalFieldSkillSources(state:any,sourceItemId?:string){
  const actorId=state.角色?.主控单位ID,actor=state.战斗单位?.列表?.[actorId];
  if(!actor)throw Error('尚未建立魂师');
  if(sourceItemId&&!rules.world.isCarriedItem(state,state.物品.实例[sourceItemId],actorId))throw Error('请先将这件物品带在身边');
  const base=rules.combat.martialBaseSkill(actor);
  const owned=[...(actor.能力?.技能ID??[]).map((id:string)=>state.技能.列表[id]),...(base?.mode==='disguise'?[base]:[])].filter((skill:any)=>skill&&(!sourceItemId||skill.sourceItemId===sourceItemId)&&rules.abilities.fieldBranches(skill.effectGraph,{indivisible:!!skill.medicine||skill.sourceKind==='consumable'}).length>0);
  const skills=owned.map((skill:any)=>({id:skill.id,name:skillName(skill,state),defaultFieldSelection:{skillId:skill.id,branchIds:rules.abilities.selectFieldBranches(skill).map((b:any)=>b.id),...(skill.defaultCastMode?{modeId:skill.defaultCastMode}:{})},selfOnly:skill.sourceKind!=='consumable'&&skill.effectGraph.nodes.some((node:any)=>node.effectId==='target.self'),defaultModeId:skill.defaultCastMode??'',branches:rules.abilities.fieldBranches(skill.effectGraph,{indivisible:!!skill.medicine||skill.sourceKind==='consumable'}).map((branch:any)=>({id:branch.id,name:branch.label||branch.nodes.filter((n:any)=>!['release','targeting','check'].includes(n.family)).map((n:any)=>rules.effects.EFFECT_REGISTRY[n.effectId].displayName).join('、')})),modes:(skill.castModes??[]).map((mode:any)=>({id:mode.id,name:mode.name??mode.id}))}));
  return {actorId,actor,owned,skills};
}

/** Listing a cast source does not require selecting its first target or simulating a use. */
export function personalFieldSkillOptions(state:any){return personalFieldSkillSources(state).skills;}

/** Only the owner's actual abilities and actual world previews enter this action panel. */
export function personalFieldAbilities(state:any,input:Record<string,unknown>={}) {
  for(const [key,value] of Object.entries(input)){
    if(key==='force'){if(typeof value!=='boolean')throw Error('场外能力选择参数无效');}
    else if(['branchIds','materials'].includes(key)){if(!Array.isArray(value))throw Error('场外用途或材料选择无效');}
    else if(key==='quantity'){if(!Number.isSafeInteger(value)||Number(value)<1||Number(value)>10)throw Error('造物数量无效');}
    else if(!['skillId','targetId','modeId','permissionId','sourceItemId','targetItemId','recipeId','blueprintId','deviceNodeId','lockId','knowledgeId'].includes(key)||typeof value!=='string'||!value)throw Error('场外能力选择参数无效');
  }
  const {actorId,actor,owned,skills}=personalFieldSkillSources(state,input.sourceItemId as string|undefined);
  const skill=input.skillId?owned.find((entry:any)=>entry.id===input.skillId):owned[0];
  if(input.skillId&&!skill)throw Error('请选择本人实际持有的场外能力');
  let selected=null;
  if(skill){
    const modeId=(input.modeId??skill.defaultCastMode) as string|undefined;
    const source=skill.castOrigin?.source??skill;
    const costSkill=rules.effects.soulRingNativeRank(skill)&&rules.effects.soulRingAvailableRank(state,actor,source)>=rules.effects.soulRingMinimumRank(source)?rules.effects.currentSoulRingCastSkill(state,actor,skill):skill;
    const contract=rules.combat.fieldCostContract(actor,costSkill,modeId);
    const branches=rules.abilities.selectFieldBranches(skill,input.branchIds),nodes=branches.flatMap((b:any)=>b.nodes);
    const selfOnly=skill.sourceKind!=='consumable'&&nodes.some((node:any)=>node.effectId==='target.self');
    const candidates=rules.residentRealms.isCaptureSkill(skill,branches.map((b:any)=>b.id))?Object.values(state.人物.列表).map((p:any)=>state.战斗单位.列表[p.id]??{id:p.id,存活状态:p.status==='dead'?'死亡':'存活'}):Object.values(state.战斗单位.列表);
    const targets=(candidates as any[]).filter(unit=>state.人物?.列表?.[unit.id]&&unit.存活状态!=='死亡'&&state.人物?.列表?.[unit.id]?.status!=='dead'&&(unit.id===actorId||!selfOnly&&rules.actions.colocated(state,actorId,unit.id)&&!rules.actions.battleOf(state,unit.id))).map(unit=>({id:unit.id,name:playerText(rules.disguise.presentation(state,unit.id,actorId).name??unit.名称,state,'人物'),self:unit.id===actorId}));
    const targetId=String(input.targetId??actorId);
    if(!targets.some(target=>target.id===targetId))throw Error('目标不在当前实际场景，或不适用于这项能力');
    const deviceNode=nodes.find((n:any)=>rules.deviceOperations.EFFECT_TYPES[n.effectId]),itemNode=deviceNode??nodes.find((n:any)=>['payload.repair_item','payload.fabricate'].includes(n.effectId));
    const itemChoices=deviceNode?rules.deviceOperations.facts(state,actorId).items.flatMap((item:any)=>item.operations.filter((op:any)=>op.skillId===skill.id&&op.nodeId===deviceNode.id&&op.targets.includes(targetId)).map((op:any)=>({id:deviceOperationKey(op.intent),name:item.name,detail:deviceLockLabel(item.locks,op.lockId)+' · '+(op.available?'当前可操作':op.reason),targetItemId:item.itemId,deviceNodeId:deviceNode.id,lockId:op.lockId,knowledgeId:op.intent.knowledgeId,available:op.available}))):itemNode?rules.creation.itemChoices(state,actorId,targetId,itemNode):[];
    let itemSelection:any={};
    if(itemNode){
      const chosen=input.targetItemId||input.recipeId||input.blueprintId?itemChoices.find((v:any)=>input.targetItemId===v.targetItemId&&v.targetItemId&&(!input.lockId||input.lockId===v.lockId)&&(!input.knowledgeId||input.knowledgeId===v.knowledgeId)||input.recipeId===v.recipeId&&v.recipeId||input.blueprintId===v.blueprintId&&v.blueprintId):itemChoices[0];
      if(chosen)itemSelection=chosen.targetItemId?{targetItemId:chosen.targetItemId,...(deviceNode?{deviceNodeId:chosen.deviceNodeId,...(chosen.lockId?{lockId:chosen.lockId}:{}),...(chosen.knowledgeId?{knowledgeId:chosen.knowledgeId}:{})}:{})}:chosen.recipeId?{recipeId:chosen.recipeId}:{blueprintId:chosen.blueprintId};
    }
    const requestScope:any={branchIds:branches.map((b:any)=>b.id),...(modeId?{modeId}:{}),...itemSelection,...(itemNode?.effectId==='payload.fabricate'?{quantity:input.quantity??1}:{}),...(input.materials!==undefined?{materials:input.materials}:{})};
    const quotes=rules.world.previewFieldIntents(state,targets.map(target=>({type:'use-field-ability',skillId:skill.id,targetId:target.id,...requestScope,force:input.force===true,...(target.id===input.targetId&&input.permissionId?{permissionId:input.permissionId}:{})})));
    for(let i=0;i<quotes.length;i++)quotes[i]=publicCaptureQuote(state,skill,branches.map((b:any)=>b.id),targets[i].id,quotes[i]);
    const quote=quotes[targets.findIndex(target=>target.id===targetId)],payment=quote.payment;
    const paymentLines=payment?[...Object.entries(payment.totals).filter(([,amount])=>Number(amount)>0).map(([kind,amount])=>costLine(state,{kind,amount})),...payment.items.map((item:any)=>costLine(state,{...item,kind:'item'})),...exchangeLines(skill,'skill',state)]:[];
    const usage=rules.combat.skillUsageAvailability(state,actor,skill,true);
    const requestPreview=targetId!==actorId?rules.world.previewIntent(state,{type:'request-ability-use',skillId:skill.id,targetId,...requestScope}):null;
    const recipient=state.战斗单位.列表[targetId],recovery=nodes.some((n:any)=>n.effectId==='payload.soul_restore'||n.effectId==='payload.restore'&&n.params.魂力模式!=='无'),day=state.世界.时间.day,used=recipient.扩展?.场外回魂日账;
    selected={contractOath:nodes.some((n:any)=>n.effectId==='contract.oath'),capture:rules.residentRealms.isCaptureSkill(skill,branches.map((b:any)=>b.id)),captureRules:rules.residentRealms.captureRules(skill,branches.map((b:any)=>b.id)),skillId:skill.id,targetId,requestScope,branches:skills.find((v:any)=>v.id===skill.id)?.branches??[],itemOperation:itemNode?.effectId??null,itemChoices,maximumQuantity:itemNode?.params?.最大数量??1,materials:(Object.values(rules.expedition.personMaterials(state,actorId)) as any[]).map((row:any)=>({fingerprint:row.fingerprint,name:materialName(row,state),quantity:row.quantity,unitValue:row.unitValue,selected:input.materials===undefined?row.quantity:(input.materials as any[]).find(v=>v.fingerprint===row.fingerprint)?.quantity??0})),creationQuotes:[...(quote.creationQuotes??[]),...(quote.deviceOperation?.materials?[{productName:'实体锁钥匙',quantity:1,materials:quote.deviceOperation.materials}]:[])],modeId:modeId??'',targets:targets.map((target,index)=>({...target,available:quotes[index].available,reason:quotes[index].available?'':costReason(state,quotes[index].reason??'')})),
      force:input.force===true,permissionId:input.permissionId??null,consumable:rules.abilities.consumableDisposition(skill),canRequest:requestPreview?.available??false,requestReason:!requestPreview||requestPreview.available?'':costReason(state,requestPreview.reason??''),recipientPower:targetId!==actorId&&rules.disguise.presentation(state,targetId,actorId).auraHidden?null:rules.controls.powerFacts(state,targetId),recoveryQuota:recovery&&skill.sourceKind!=='consumable'?{used:used?.day===day?used.total:0,strongUsed:used?.day===day?used.strong:0,total:2,strongTotal:1}:null,
      contract:{requirements:contract.requirements.map((id:string)=>rules.abilities.LABELS[id]),costLines:contract.costs.map((fee:any)=>costLine(state,fee)),maintenanceLines:contract.maintenance.map((fee:any)=>costLine(state,fee)),sourceItem: ['consumable','hidden-weapon'].includes(skill.sourceKind)?state.物品?.实例?.[skill.sourceItemId]?.name??'来源物品':null},
      usage:{dailyLimit:usage.rules.dailyLimit,dailyUsed:usage.dailyUsed,dailyRemaining:usage.dailyRemaining,worldReadyDay:usage.worldReadyDay,cooldownMinutes:usage.cooldownRemaining},
      preview:{available:quote.available,reason:quote.available?'':costReason(state,quote.reason??''),timingNotices:[...(quote.timingNotices??[]),...(branches.some((b:any)=>b.excluded.length)?[`本次场外作用只包含${nodes.filter((n:any)=>!['release','targeting','check'].includes(n.family)).map((n:any)=>rules.effects.EFFECT_REGISTRY[n.effectId].displayName).join('、')}；${branches.flatMap((b:any)=>b.excluded).map((n:any)=>rules.effects.EFFECT_REGISTRY[n.effectId].displayName).join('、')}仅在战斗中生效。`]:[])],paymentLines,activationLock:payment?.activationLock??0,exhaustsLife:payment?.exhaustsLife??false}};
  }else if(input.targetId||input.modeId)throw Error('请先选择本人实际持有的场外能力');
  const maintenance=personalMaintenanceOptions(state,actorId).map(entry=>({...entry,sourceId:entry.maintenanceSourceId,name:entry.skillName}));
  return {actorId,actorName:playerText(state.人物.列表[actorId]?.name,state),skills,selected,maintenance,disguises:rules.disguise.options(state,actorId),requests:rules.world.abilityUseFacts(state,actorId)};
}
export type PersonalFieldAbilitiesFacts=ReturnType<typeof personalFieldAbilities>;

/** Physical abilities stay available independently of a target's ability to chat. */
export function targetFieldAbilityOptions(state:any,targetId:string){
 const actorId=state.角色?.主控单位ID,target=state.人物?.列表?.[targetId];if(!target||targetId===actorId)return [];
 const skills=(state.战斗单位?.列表?.[actorId]?.能力?.技能ID??[]).map((id:string)=>state.技能.列表[id]).filter((skill:any)=>skill&&rules.abilities.fieldBranches(skill.effectGraph,{indivisible:!!skill.medicine||skill.sourceKind==='consumable'}).length);
 const baseUses=skills.flatMap((skill:any)=>{const branches=rules.abilities.fieldBranches(skill.effectGraph,{indivisible:!!skill.medicine||skill.sourceKind==='consumable'}),groups=skill.medicine||skill.sourceKind==='consumable'?[branches]:branches.map((b:any)=>[b]);return groups.filter((group:any[])=>group.length&&(skill.sourceKind==='consumable'||!group.flatMap((b:any)=>b.nodes).some((n:any)=>n.effectId==='target.self'))).map((group:any[])=>({skill,branchIds:group.map((b:any)=>b.id),label:group.map((b:any)=>b.label||b.nodes.filter((n:any)=>!['release','targeting','check'].includes(n.family)).map((n:any)=>rules.effects.EFFECT_REGISTRY[n.effectId].displayName).join('、')).join('、')}));});
 const uses=baseUses.flatMap((use:any)=>use.skill.sourceKind==='consumable'&&rules.abilities.describe(use.skill).requirements.includes('ingest')?[use,{...use,force:true}]:[use]);
 const intents=uses.map(({skill,branchIds,force}:any)=>({type:'use-field-ability',skillId:skill.id,targetId,branchIds,...(force?{force:true}:{})})),quotes=rules.world.previewFieldIntents(state,intents);
 for(let i=0;i<quotes.length;i++)quotes[i]=publicCaptureQuote(state,uses[i].skill,uses[i].branchIds,targetId,quotes[i]);
 return uses.map(({skill,branchIds,label,force}:any,index:number)=>({id:skill.id+':'+branchIds.join(',')+(force?':force':''),skillId:skill.id,name:(force?'强制喂服 · ':'')+skillName(skill,state)+(baseUses.filter((v:any)=>v.skill.id===skill.id).length>1?' · '+label:''),available:quotes[index].available,reason:quotes[index].reason??'',intent:intents[index],costLines:quotes[index].payment?[...quotes[index].payment.contract.costs.filter((fee:any)=>fee.kind!=='item').map((fee:any)=>costLine(state,fee)),...quotes[index].payment.items.map((fee:any)=>costLine(state,{kind:'item',itemId:fee.itemId,quantity:fee.quantity}))]:[...rules.abilities.describe(skill).costs.map((fee:any)=>costLine(state,fee)),...(skill.sourceKind==='consumable'?[costLine(state,{kind:'item',itemId:skill.sourceItemId,quantity:1})]:[])],contractOath:rules.abilities.selectFieldBranches(skill,branchIds).flatMap((b:any)=>b.nodes).some((n:any)=>n.effectId==='contract.oath'),capture:rules.residentRealms.isCaptureSkill(skill,branchIds),captureRules:rules.residentRealms.captureRules(skill,branchIds),permanentBinding:rules.abilities.selectFieldBranches(skill,branchIds).flatMap((b:any)=>b.nodes).some((n:any)=>n.effectId==='realm.capture')}));
}
