(function(root,factory){const api=factory(root);if(typeof module!=='undefined'&&module.exports)module.exports=api;root.SoulEvolution=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 'use strict';
 const VERSION=1,MATERIAL_CONVERSION=20,MINUTES_PER_POINT=30;
 const clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v)),hash=v=>root.SoulAbilityContract.hash(v),core=()=>root.SoulMartialSoulCore,world=()=>root.SoulWorldEngine,effects=()=>root.SoulEffectCompiler;
 const now=s=>root.SoulPersonCore.now(s),table=s=>s.扩展?.soulEvolution??{version:VERSION,plans:[],events:[],operations:{},grants:[]};
 const mutable=s=>s.扩展.soulEvolution??={version:VERSION,plans:[],events:[],operations:{},grants:[]};
 const definition=s=>clone((s.扩展?.结构化武魂??s.结构化武魂).definition);
 const compile=(d,id)=>core().finalizeDraft({...clone(d),presetId:'',playerConfirmed:true},{budget:999999,id});
 function withDefinition(soul,d){const c=compile(d,soul.id);return root.SoulCombatFoundation.normalizeMartialSoul({...clone(soul),名称:c.name,品级:c.quality.value,品级标签:c.quality.name,形态:c.definition.form,定位:c.definition.role,结构化武魂:c,扩展:{...clone(soul.扩展),结构化武魂:c}},soul.持有者单位ID);}
 const traitKey=v=>v.templateId+':'+v.parameter;
 function components(d){
  const c=core(),rows=[];
  for(const id of d.categories)rows.push({key:'category:'+id,kind:'category',id,label:c.CATEGORY_REGISTRY[id].name,points:c.CATEGORY_REGISTRY[id].cost});
  for(const a of d.attributes)rows.push({key:'attribute:'+a.id,kind:'attribute',id:a.id,label:c.ATTRIBUTE_REGISTRY[a.id].name,points:a.investment});
  for(const id of d.channels)rows.push({key:'channel:'+id,kind:'channel',id,label:c.CHANNEL_REGISTRY[id].name,points:c.CHANNEL_REGISTRY[id].cost});
  for(const t of d.traits){const spec=c.TRAIT_TEMPLATES.find(v=>v.id===t.templateId);rows.push({key:'trait:'+traitKey(t),kind:'trait',id:t.templateId,parameter:t.parameter,label:spec.name,points:spec.baseCost+spec.perLevel*(t.level-1)});}
  rows.push({key:'base:'+hash({...d.baseAction,powerTier:0}),kind:'baseAction',id:d.baseAction.mode,attributeId:d.baseAction.attributeId,label:'基础动作',points:c.componentCost(d).ledger.find(v=>v.kind==='baseAction').cost});
  return rows;
 }
 function diff(before,after){
  const prior=components(before),next=components(after),charges=[];
  for(const r of next){const previous=prior.find(v=>v.key===r.key);if(!previous||r.points>previous.points)charges.push({...r,points:Math.max(0,r.points-(previous?.points??0)),from:previous?.points??0});}
  // Removing a burden repays its original rebate. Dropping positive components never finances additions.
  for(const w of before.weaknesses){const remaining=after.weaknesses.find(v=>traitKey(v)===traitKey(w)),spec=core().WEAKNESS_TEMPLATES.find(v=>v.id===w.templateId),removed=remaining?Math.max(0,w.level-remaining.level):spec.refund+w.level-1;if(removed)charges.push({key:'repair:'+traitKey(w),kind:'repair',id:w.templateId,label:'修复'+spec.name,points:removed});}
  if(hash(before.exchangeContracts)!==hash(after.exchangeContracts))throw Error('进化保留现有交换约定；请先完成原约定再调整');
  const removed=prior.filter(r=>!next.some(v=>v.key===r.key)),families=d=>new Set(d.categories.map(id=>core().CATEGORY_REGISTRY[id].family)),a=families(before),b=families(after);
  return {charges,removed,points:charges.reduce((n,r)=>n+r.points,0),crossType:[...b].some(f=>!a.has(f)),mutation:removed.length>0||hash(before.categories)!==hash(after.categories)||hash(before.baseAction)!==hash(after.baseAction),beforeQuality:core().inspectDraft(before,{budget:999999}).quality,afterQuality:core().inspectDraft(after,{budget:999999}).quality};
 }
 function splitStages(soul,target){
  const before=definition(soul),after=compile(target,soul.id).definition,change=diff(before,after);
  if(!change.crossType)return [after];
  // The transition retains every old action and property, and acquires only the new structure.
  const transition=clone(before);delete transition.presetId;
  transition.name=after.name+'·过渡';transition.concept=after.concept;transition.form=before.form+'，逐渐显出'+after.form;
  transition.categories=[...new Set([...before.categories,...after.categories])];
  transition.attributes=[...before.attributes.map(a=>({id:a.id,investment:Math.max(a.investment,after.attributes.find(b=>b.id===a.id)?.investment??0)})),...after.attributes.filter(a=>!before.attributes.some(b=>b.id===a.id))];
  transition.channels=[...new Set([...before.channels,...after.channels])];
  transition.traits=[...before.traits.map(t=>({...t,level:Math.max(t.level,after.traits.find(a=>traitKey(a)===traitKey(t))?.level??0)})),...after.traits.filter(t=>!before.traits.some(a=>traitKey(a)===traitKey(t)))];
  return [compile(transition,soul.id).definition,after];
 }
 function materialEvidence(state,stack){
  const c=core(),attributes=Object.entries(stack.attributeSpectrum??{}).filter(([,v])=>Number(v)>0).map(([name])=>Object.values(c.ATTRIBUTE_REGISTRY).find(a=>a.name===name)?.id).filter(Boolean);
  const channels=(stack.channels??[]).map(name=>Object.values(c.CHANNEL_REGISTRY).find(a=>a.id===name||a.name===name)?.id).filter(Boolean);
  const categories=(stack.categories??[]).map(name=>Object.values(c.CATEGORY_REGISTRY).find(a=>a.id===name||a.name===name||a.tags.includes(name))?.id).filter(Boolean);
  const traits=(stack.traits??[]).map(name=>c.TRAIT_TEMPLATES.find(a=>a.id===name||a.name===name)?.id).filter(Boolean);
  const registered=root.SoulEvolutionContent?.SOURCES.find(s=>stack.sourceGroup==='evolution-source:'+s.id);
  return {attributes,channels,categories,traits,...(registered?.repairs?{repairs:clone(registered.repairs)}:{})};
 }
 function sourceOptions(state,actorId=state.角色.主控单位ID){
  const materials=Object.values(root.SoulExpeditionEngine.personMaterials(state,actorId)).filter(m=>m.quantity>0).map(m=>({id:'material:'+m.fingerprint,type:'material',ownerId:actorId,fingerprint:m.fingerprint,name:m.displayName,quantity:m.quantity,unitValue:m.unitValue,evidence:materialEvidence(state,m),proof:clone(m)}));
  const grants=table(state).grants.filter(g=>!g.consumedBy&&(g.itemId?state.物品.实例[g.itemId]?.ownerEntityId===actorId:g.ownerId===actorId)).flatMap(g=>(g.lots??[{value:g.value,evidence:g.evidence}]).map((lot,i)=>({id:g.id+':'+i,grantId:g.id,type:g.kind,ownerId:actorId,name:g.name,quantity:1,unitValue:lot.value,evidence:clone(lot.evidence),proof:clone(g)})));
  return [...materials,...grants];
 }
 function selectSources(state,payerId,selections){
  const options=sourceOptions(state,payerId),seen=new Set();
  return (selections??[]).map(selection=>{const id=selection.id??'material:'+selection.fingerprint,source=options.find(v=>v.id===id),quantity=selection.quantity??1;
   if(!source||seen.has(id)||!Number.isSafeInteger(quantity)||quantity<1||quantity>source.quantity)throw Error('所选材料已变化或数量不足，请重新选材');seen.add(id);return {...source,quantity,value:quantity*source.unitValue};});
 }
 function availableSources(state,payerId,selections){const options=sourceOptions(state,payerId);return (selections??[]).flatMap(s=>{const id=s.id??'material:'+s.fingerprint,src=options.find(v=>v.id===id);return src?[{...src,quantity:Math.min(s.quantity??1,src.quantity),value:Math.min(s.quantity??1,src.quantity)*src.unitValue}]:[];});}
 function supports(source,component){
  const e=source.evidence,c=core();
  if(component.kind==='process')return !component.evidenceRequirement||component.evidenceRequirement.attributes.every(a=>e.attributes.includes(a))&&component.evidenceRequirement.channels.some(c=>e.channels.includes(c));
  if(component.kind==='attribute')return e.attributes.includes(component.id);
  if(component.kind==='category')return e.categories.includes(component.id);
  if(component.kind==='channel')return e.channels.includes(component.id);
  if(component.kind==='baseAction')return e.attributes.includes(component.attributeId)&&e.channels.some(id=>c.CHANNEL_REGISTRY[id].effectIds.includes(c.BASE_ACTION_MODES[component.id]?.releaseId??'domain.field'));
  if(component.kind==='repair')return e.repairs?.includes(component.id)||component.id==='weakness.soul-cost'&&e.attributes.includes('attribute.life');
  if(component.kind==='trait')return e.traits.includes(component.id)||(component.id==='trait.attribute-mastery'||component.id==='trait.resistance')&&e.attributes.includes(component.parameter)||component.id==='trait.channel-mastery'&&e.channels.includes(component.parameter);
  return false;
 }
 // Integral maximum flow, so a versatile source can be split without being counted twice.
 function allocate(sources,charges){
  const demands=charges.map(c=>({...c,value:c.value??c.points*MATERIAL_CONVERSION})),count=2+sources.length+demands.length,sink=count-1,edges=Array.from({length:count},()=>[]);
  function edge(a,b,capacity){const f={to:b,capacity,original:capacity,reverse:edges[b].length},r={to:a,capacity:0,original:0,reverse:edges[a].length};edges[a].push(f);edges[b].push(r);return f;}
  const links=[];sources.forEach((s,i)=>edge(0,1+i,s.value));
  demands.forEach((d,j)=>{edge(1+sources.length+j,sink,d.value);sources.forEach((s,i)=>{if(supports(s,d))links.push({i,j,edge:edge(1+i,1+sources.length+j,s.value)});});});
  let paid=0;
  while(true){const queue=[0],previous=Array(count).fill(null);previous[0]=[-1,-1];for(let q=0;q<queue.length&&!previous[sink];q++){const a=queue[q];edges[a].forEach((e,k)=>{if(e.capacity>0&&!previous[e.to]){previous[e.to]=[a,k];queue.push(e.to);}});}if(!previous[sink])break;let amount=Infinity;for(let p=sink;p!==0;p=previous[p][0])amount=Math.min(amount,edges[previous[p][0]][previous[p][1]].capacity);for(let p=sink;p!==0;p=previous[p][0]){const [a,k]=previous[p],e=edges[a][k];e.capacity-=amount;edges[p][e.reverse].capacity+=amount;}paid+=amount;}
  const assignments=links.map(l=>({sourceId:sources[l.i].id,componentKey:demands[l.j].key,value:l.edge.original-l.edge.capacity})).filter(r=>r.value>0);
  const gaps=demands.map(d=>({...d,missingValue:d.value-assignments.filter(a=>a.componentKey===d.key).reduce((n,a)=>n+a.value,0)})).filter(r=>r.missingValue>0);
  const consumed=sources.map(s=>{const value=assignments.filter(a=>a.sourceId===s.id).reduce((n,a)=>n+a.value,0);return {...clone(s),quantity:Math.ceil(value/s.unitValue),allocatedValue:value};}).filter(s=>s.quantity>0);
  return {pass:!gaps.length,requiredValue:demands.reduce((n,d)=>n+d.value,0),paid,assignments,gaps,consumed};
 }
 function stateKey(state,soul){return hash({definition:definition(soul),rings:soul.魂环ID列表.map(id=>{const r=state.魂环.列表[id];return {id,skills:r.魂技ID列表.map(k=>state.技能.列表[k]?.immutableHash),sealed:r.扩展?.evolutionSealed??false};}),limit:state.成长.列表[soul.持有者单位ID]?.扩展?.evolutionLimit??null});}
 function ownedSoul(state,input){const actorId=input.actorId??state.角色.主控单位ID,soul=state.武魂.列表[input.soulId];if(!soul||soul.持有者单位ID!==actorId)throw Error('请选择本人拥有的武魂');return {actorId,soul};}
 const compatible=(skill,soul)=>skill.effectGraph.nodes.every(n=>core().allowsEffect(soul,n.effectId,n.params));
 function ringBudget(ring){return Math.max(0,Number(ring.价值?.可用点数??0)-Number(ring.价值?.表达成长??0));}
 function rebuildSkill(state,ring,old,soul,sources,input,id){
  const specs=input.effects??input.requestedEffects;if(!Array.isArray(specs)||!specs.length)throw Error('请为重构魂技选择实际能力');
  const e=effects(),graph=e.makeLinearGraph(specs),tier=root.SoulCombatFoundation.getAgeTier(ring.年限);
  const original=state.魂兽档案.列表[ring.来源魂兽档案ID],lineage=original?.血脉?root.SoulCombatFoundation.BEAST_VALUE.validateLineage(original.血脉).compiled:null;
  const proofs=[];
  for(const n of graph.nodes){
   if(!core().allowsEffect(soul,n.effectId,n.params))throw Error('变化后的武魂尚未具备这项魂技能力');
   const family=e.EFFECT_REGISTRY[n.effectId]?.family,attrs=core().effectAttributeIds(n.effectId,n.params),channels=core().channelsForEffect(soul,n.effectId,n.params);
   const originalSupports=(lineage&&core().allowsEffect(lineage,n.effectId,n.params))||old.effectGraph.nodes.some(v=>v.effectId===n.effectId&&hash(v.params)===hash(n.params));
   const added=sources.filter(s=>channels.some(c=>s.evidence.channels.includes(c))&&attrs.every(a=>s.evidence.attributes.includes(a)));
   const shells=['targeting','release','check','sustain'].includes(family);
   if(!originalSupports&&!added.length&&!shells)throw Error('重构能力还缺少对应魂环或进化材料来源');
   proofs.push({nodeId:n.id,original:!!originalSupports||shells,sourceIds:added.map(s=>s.id),requirement:{attributes:attrs,channels}});
  }
  const value=e.rawAbilityValue(graph),skill={id,name:String(input.name??old.name),description:String(input.description??''),ownerKind:'魂师',sourceKind:'soul-ring',sourceMartialSoulId:soul.id,sourceRingId:ring.id,sourceBeastProfileId:ring.来源魂兽档案ID,持有者单位ID:ring.持有者单位ID,来源武魂ID:soul.id,来源魂环ID:ring.id,来源魂兽档案ID:ring.来源魂兽档案ID,类型:'魂环魂技',名称:String(input.name??old.name),ringOrdinal:ring.序号,ageYears:ring.年限,ageTier:tier.名称,mechanismCap:tier.机制上限,effectGraph:graph,效果图:clone(graph),requirements:['gesture','martial-soul','soul-power'],valueBasis:value,soulPowerCost:value.baseSoulPowerCost,soulPowerCostRate:0,outputScale:1,usageRules:clone(old.usageRules??{}),cooldownTurns:old.cooldownTurns??0,nativeCastRank:ring.序号,minimumCastRank:ring.序号,sourceChannelIds:[...new Set(graph.nodes.flatMap(n=>core().channelsForEffect(soul,n.effectId,n.params)))],channelByEffect:Object.fromEntries(graph.nodes.map(n=>[n.effectId,core().channelsForEffect(soul,n.effectId,n.params)[0]??''])),扩展:{evolutionSource:{ringId:ring.id,originalSkillId:old.id,proofs}}};
  const priced=e.abilityValueLedger(skill),checked=e.validateGraph(graph,{ageTier:tier.名称,mechanismCap:tier.机制上限,budget:ringBudget(ring),costContract:skill});if(!checked.pass)throw Error(checked.errors.join('；'));
  skill.budget={available:ringBudget(ring),spent:priced.netValue,unallocated:ringBudget(ring)-priced.netValue};return e.sealPricedAbility(skill);
 }
 function reconstructionCharges(ring,replacements,skills){const spent=replacements.reduce((n,s)=>n+effects().abilityValueLedger(s).netValue,0),oldSpent=skills.reduce((n,s)=>n+effects().abilityValueLedger(s).netValue,0),fee=20+Math.ceil(oldSpent*.1)+Math.max(0,spent-oldSpent),needs=[...new Map(replacements.flatMap(s=>s.扩展.evolutionSource.proofs.filter(p=>!p.original).map(p=>[hash(p.requirement),p.requirement]))).values()];if(!needs.length)return [{key:'ring:'+ring.id,kind:'process',id:ring.id,label:'第'+ring.序号+'环重构',value:fee,points:0}];return needs.map((requirement,i)=>({key:'ring:'+ring.id+':'+i,kind:'process',id:ring.id,label:'第'+ring.序号+'环重构来源',value:Math.floor(fee/needs.length)+(i<fee%needs.length?1:0),points:0,evidenceRequirement:requirement}));}
 function preview(state,input){
  const {actorId,soul}=ownedSoul(state,input),payerId=input.payerId??state.角色.主控单位ID;if(!state.人物.列表[payerId])throw Error('付款人不存在');if(payerId!==state.角色.主控单位ID&&payerId!==actorId)throw Error('不能未经本人同意使用第三人的材料');
  const sources=selectSources(state,payerId,input.sources??input.materials),stages=input.stages??splitStages(soul,input.target),quotes=[];let previous=clone(soul);
  if(!Array.isArray(stages)||!stages.length||stages.length>8)throw Error('请选择一至八个可实施阶段');
  const overall=diff(definition(soul),compile(stages.at(-1),soul.id).definition);
  if(overall.crossType&&stages.length<2)throw Error('跨类型变异需要先建立过渡结构，再完成新形态');
  const ringViews=new Map(soul.魂环ID列表.map(id=>[id,clone(state.魂环.列表[id])])),skillViews={...state.技能.列表};
  for(let index=0;index<stages.length;index++){
   const next=withDefinition(previous,stages[index]),change=diff(definition(previous),definition(next)),charges=clone(change.charges),ringChoices=[],errors=[];
   if(index===0&&change.crossType){const old=definition(previous);if(old.categories.some(c=>!definition(next).categories.includes(c))||old.channels.some(c=>!definition(next).channels.includes(c))||hash(old.baseAction)!==hash(definition(next).baseAction))throw Error('过渡阶段应保留原类别与基础能力，后续阶段再完成替换');}
   if(input.repairLimit&&index===0){const limit=state.成长.列表[actorId]?.扩展?.evolutionLimit;if(!limit)throw Error('当前没有待修复的成长障碍');charges.push({key:'repair:limit',kind:'repair',id:limit.id,label:'解除成长障碍',points:limit.repairValue/MATERIAL_CONVERSION});}
   const choices=(input.rings??[]).filter(r=>(r.stageIndex??0)===index);
   for(const id of soul.魂环ID列表){const ring=ringViews.get(id),choice=choices.find(r=>r.ringId===id),skills=ring.魂技ID列表.map(k=>skillViews[k]).filter(Boolean),mode=choice?.mode??'keep';
    if(!['keep','rebuild','seal','restore'].includes(mode))throw Error('魂环处理方式无效');
    if(mode==='keep'&&!ring.扩展?.evolutionSealed&&skills.some(s=>!compatible(s,next)))errors.push('第'+ring.序号+'环需要重构或封存');
    let replacements=[];
    if(mode==='restore'&&skills.some(s=>!compatible(s,next)))errors.push('第'+ring.序号+'环尚未适应当前武魂');
    if(mode==='rebuild'){
     if(!Array.isArray(choice.skills)||choice.skills.length!==skills.length)throw Error('重构应保留原魂环的技能数量');
     replacements=choice.skills.map((spec,i)=>rebuildSkill(state,ring,skills[i],next,sources,spec,'evolved:'+skills[i].id+':'+hash({target:definition(next),spec}).slice(0,12)));
     const spent=replacements.reduce((n,s)=>n+s.budget.spent,0),oldSpent=skills.reduce((n,s)=>n+Number(s.budget?.spent??effects().abilityValueLedger(s).netValue),0);
     if(spent>ringBudget(ring))throw Error('重构超出原魂环可用额度，请改为后续魂环方向');
     replacements=replacements.map((s,i)=>{s.budget.available=s.budget.spent+(i===replacements.length-1?ringBudget(ring)-spent:0);s.budget.unallocated=s.budget.available-s.budget.spent;return effects().sealPricedAbility(s);});
     charges.push(...reconstructionCharges(ring,replacements,skills));
    }
    ringChoices.push({ringId:id,ordinal:ring.序号,years:ring.年限,mode,skills:replacements,previousSkillIds:clone(ring.魂技ID列表)});
    ring.扩展??={};if(mode==='rebuild'){ring.魂技ID列表=replacements.map(s=>s.id);for(const skill of replacements)skillViews[skill.id]=skill;ring.扩展.evolutionSealed=false;}else if(mode==='seal')ring.扩展.evolutionSealed=true;else if(mode==='restore')ring.扩展.evolutionSealed=false;
   }
   const allocation=allocate(sources,charges),minutes=(input.repairLimit&&index===0?60+change.charges.filter(c=>!(c.kind==='repair'&&c.id==='weakness.soul-cost')).reduce((n,c)=>n+c.points,0)*MINUTES_PER_POINT:Math.max(30,change.points*MINUTES_PER_POINT))+ringChoices.filter(r=>r.mode==='rebuild').length*30;
   quotes.push({index,before:definition(previous),after:definition(next),change,charges,allocation,minutes,ringChoices,errors,ready:allocation.pass&&!errors.length,repairLimit:!!input.repairLimit&&index===0});previous=next;
  }
  if(input.artId!==undefined&&(typeof input.artId!=='string'||!/^[a-z0-9.:-]{1,140}$/.test(input.artId)))throw Error('请选择已登记的武魂图片');
  return {version:VERSION,...(input.artId?{artId:input.artId}:{}),actorId,payerId,soulId:soul.id,goal:String(input.goal??''),stateKey:stateKey(state,soul),sourceSelections:clone(input.sources??input.materials??[]),stages:quotes,ready:quotes[0].ready};
 }
 function transact(raw,input,id,kind,fn){
  if(!id||typeof id!=='string')throw Error('操作缺少编号');const db=table(raw),requestHash=hash({kind,input}),prior=db.operations[id];
  if(prior){if(prior.requestHash!==requestHash)throw Error('该操作编号已经用于另一项安排');return {state:clone(raw),receipt:clone(prior.receipt),idempotent:true};}
  const state=world().normalizeState(raw),receipt=fn(state),result=world().commit(state,id,'武魂进化',{...receipt,type:receipt.type??'soul-evolution',sourceId:id});mutable(state).operations[id]={kind,requestHash,receipt:clone(result.receipt)};return result;
 }
 function adopt(raw,input,id){return transact(raw,input,id,'adopt',state=>{
  const quote=preview(state,input),plan={id:'evolution:'+id,...quote,status:quote.actorId===state.角色.主控单位ID?'adopted':'proposed',stageIndex:0,createdAt:now(state),acceptedBy:quote.actorId===state.角色.主控单位ID?quote.actorId:null,stages:quote.stages.map(s=>({...s,status:'pending'}))};
  if(table(state).plans.some(p=>p.soulId===plan.soulId&&!['cancelled','completed','refused'].includes(p.status)))throw Error('这个武魂已有进行中的变化，请先继续或取消原方案');
  mutable(state).plans.push(plan);return {planId:plan.id,actorId:plan.actorId,payerId:plan.payerId,status:plan.status,summary:plan.status==='proposed'?'方案已交给本人考虑。':'已采用进化方案，可以开始当前阶段。'};
 });}
 function respond(raw,input,id){return transact(raw,input,id,'respond',state=>{const p=table(state).plans.find(v=>v.id===input.planId);if(!p||p.status!=='proposed'||input.actorId!==p.actorId||typeof input.accept!=='boolean')throw Error('没有本人待回应的进化方案');p.status=input.accept?'adopted':'refused';p.acceptedBy=input.accept?p.actorId:null;p.decision={sourceId:id,actorId:p.actorId,accept:input.accept,at:now(state)};return {planId:p.id,actorId:p.actorId,accepted:input.accept,summary:input.accept?'本人接受了这份进化方案。':'本人暂未接受这份方案。'};});}
 function consume(state,allocation,sourceId){const used=new Set();for(const src of allocation.consumed){if(src.type==='material'){const stack=root.SoulExpeditionEngine.personMaterials(state,src.ownerId)[src.fingerprint];if(!stack||stack.quantity<src.quantity||hash(materialEvidence(state,stack))!==hash(src.evidence)||stack.unitValue!==src.unitValue)throw Error('材料已经变化，请补齐后继续');stack.quantity-=src.quantity;if(stack.quantity===0)delete root.SoulExpeditionEngine.personMaterials(state,src.ownerId)[src.fingerprint];}else{if(used.has(src.grantId))continue;const grant=table(state).grants.find(g=>g.id===src.grantId);if(!grant||grant.consumedBy)throw Error('成长来源已经使用');grant.consumedBy=sourceId;used.add(grant.id);if(grant.itemId){const item=state.物品.实例[grant.itemId];if(!item||item.ownerEntityId!==src.ownerId)throw Error('成长物品已不在付款人行囊中');state.容器.列表[item.containerId].itemIds=state.容器.列表[item.containerId].itemIds.filter(id=>id!==item.id);delete state.物品.实例[item.id];}}}}
 function applyStage(state,plan,stage,sourceId){
  const soul=state.武魂.列表[plan.soulId];if(stateKey(state,soul)!==plan.stateKey)throw Error('武魂或魂技已有变化，请重新设计当前阶段');
  const sources=availableSources(state,plan.payerId,plan.sourceSelections),allocation=allocate(sources,stage.charges);if(!allocation.pass)return {completed:false,reason:'当前材料不足，请补齐后继续',gaps:allocation.gaps};
  const next=withDefinition(soul,stage.after),event={id:'evolution-event:'+sourceId,kind:'evolution',actorId:plan.actorId,payerId:plan.payerId,soulId:soul.id,planId:plan.id,stageIndex:plan.stageIndex,at:now(state),before:definition(soul),after:definition(next),charges:clone(stage.charges),allocation:clone(allocation),rings:clone(stage.ringChoices),repairLimit:stage.repairLimit,previousHash:table(state).events.at(-1)?.hash??null};
  if(plan.artId)next.扩展.artId=plan.artId;
  consume(state,allocation,event.id);
  const unit=state.战斗单位.列表[plan.actorId];
  for(const choice of stage.ringChoices){const ring=state.魂环.列表[choice.ringId];ring.扩展??={};
   if(choice.mode==='rebuild'){
    ring.扩展.evolutionOriginalSkillIds??=clone(ring.魂技ID列表);unit.能力.技能ID=unit.能力.技能ID.filter(id=>!ring.魂技ID列表.includes(id));
    for(const skill of choice.skills){state.技能.列表[skill.id]=clone(skill);unit.能力.技能ID.push(skill.id);}ring.魂技ID列表=choice.skills.map(s=>s.id);ring.扩展.蓝图哈希列表=choice.skills.map(s=>s.immutableHash);ring.扩展.evolutionSealed=false;
   }else if(choice.mode==='seal'){ring.扩展.evolutionSealed=true;unit.能力.技能ID=unit.能力.技能ID.filter(id=>!ring.魂技ID列表.includes(id));}
   else if(choice.mode==='restore'){ring.扩展.evolutionSealed=false;unit.能力.技能ID=[...new Set([...unit.能力.技能ID,...ring.魂技ID列表])];}
  }
  next.扩展.structureTimeline=clone(soul.扩展.structureTimeline??{base:clone(soul.扩展.expressionBase?.definition??definition(soul)),events:(soul.扩展.expressionHistory??[]).map(g=>({kind:'expression',growth:clone(g)}))});
  event.hash=hash(event);mutable(state).events.push(event);next.扩展.structureTimeline.events.push({kind:'evolution',eventId:event.id});state.武魂.列表[soul.id]=next;
  if(stage.repairLimit)delete state.成长.列表[plan.actorId].扩展.evolutionLimit;
  stage.allocation=clone(allocation);stage.status='completed';stage.completedEventId=event.id;plan.stageIndex++;plan.status=plan.stageIndex===plan.stages.length?'completed':'adopted';plan.stateKey=stateKey(state,next);
  root.SoulCycleEngine.applyStoredExperience(state,plan.actorId);root.SoulCombatFoundation.refreshActiveMartialSoul(state,plan.actorId,{inPlace:true});if(root.SoulManifestation?.hasTrait(next)&&!root.SoulManifestation.forSoul(state,next.id))root.SoulManifestation.register(state,next.id,event.id);root.SoulManifestation?.reconcile(state);
  return {completed:true,eventId:event.id,planId:plan.id,stageIndex:plan.stageIndex-1,actorId:plan.actorId,soulId:soul.id,name:next.名称,materials:allocation.consumed.map(s=>({name:s.name,quantity:s.quantity,ownerId:s.ownerId})),summary:next.名称+'的这一阶段变化已经完成。'};
 }
 function progress(raw,input,id){return transact(raw,input,id,'progress',state=>{
  const p=table(state).plans.find(v=>v.id===input.planId);if(!p||!['adopted','running'].includes(p.status)||p.acceptedBy!==p.actorId)throw Error('请先采用并接受这份进化方案');const stage=p.stages[p.stageIndex];
  if(stateKey(state,state.武魂.列表[p.soulId])!==p.stateKey)throw Error('武魂或魂技已有变化，请重新设计');
  const reason=world().personalActionBlockReason(state,{actorId:p.actorId});if(reason)throw Error(reason);if(p.actorId!==p.payerId&&!root.SoulActionContext.colocated(state,p.actorId,p.payerId))throw Error('出资人与受益人须在同一地点交付本次材料');
  if(root.SoulActionContext.battleOf(state,p.actorId))throw Error('请在战斗结束后继续进化修习');
  if(stage.errors.length)throw Error(stage.errors.join('；'));
  if(input.sources){p.sourceSelections=clone(input.sources);}
  let action=(state.世界.longActions??[]).find(a=>a.id===stage.actionId);
  if(!action){const allocation=allocate(availableSources(state,p.payerId,p.sourceSelections),stage.charges);if(!allocation.pass)throw Error('请先备齐当前阶段的材料');
   action={id:'evolution:'+id,kind:'evolution',ownerId:p.actorId,sourceId:id,planId:p.id,stageIndex:p.stageIndex,branchId:state.扩展?.story?.branchId??'initial',startedAt:clone(state.世界.时间),progressedTo:clone(state.世界.时间),requestedMinutes:stage.minutes,remainingMinutes:stage.minutes,minutesExecuted:0,paidGold:0,targetAt:now(state)+stage.minutes,status:'interrupted',interruptions:[],steps:[]};(state.世界.longActions??=[]).push(action);stage.actionId=action.id;p.status='running';}
  const requested=input.minutes===undefined?action.remainingMinutes:input.minutes;if(!Number.isSafeInteger(requested)||requested<0)throw Error('修习时长须为非负整数');
  const before=clone(state.世界.时间),advanced=world().advanceLongTime(state,action,now(state)+Math.min(requested,action.remainingMinutes)),minutes=advanced.minutes;
  action.minutesExecuted+=minutes;action.remainingMinutes-=minutes;action.progressedTo=clone(state.世界.时间);action.targetAt=now(state)+action.remainingMinutes;
  if(advanced.interruption)action.interruptions.push({...advanced.interruption,decisionSourceId:id,time:clone(state.世界.时间)});
  let result={completed:false,summary:'本阶段已修习'+action.minutesExecuted+'分钟，余下'+action.remainingMinutes+'分钟。'};
  if(action.remainingMinutes===0&&!advanced.interruption)result=applyStage(state,p,stage,id);
  action.status=result.completed?'completed':'interrupted';action.steps.push({sourceId:id,before,after:clone(state.世界.时间),minutes,status:action.status});
  return {...result,planId:p.id,actorId:p.actorId,longActionId:action.id,minutes,remainingMinutes:action.remainingMinutes,interruption:clone(advanced.interruption??null)};
 });}
 function progressPreview(state,input){const p=table(state).plans.find(p=>p.id===input.planId);if(!p||!['adopted','running','proposed'].includes(p.status))throw Error('没有进行中的变化方案');const stage=p.stages[p.stageIndex],sources=availableSources(state,p.payerId,input.sources??p.sourceSelections),allocation=allocate(sources,stage.charges),action=state.世界.longActions?.find(a=>a.id===stage.actionId);return {...clone(stage),allocation,minutesExecuted:action?.minutesExecuted??0,remainingMinutes:action?.remainingMinutes??stage.minutes,ready:allocation.pass&&!stage.errors.length&&stateKey(state,state.武魂.列表[p.soulId])===p.stateKey};}
 function cancel(raw,input,id){return transact(raw,input,id,'cancel',state=>{const p=table(state).plans.find(v=>v.id===input.planId);if(!p||['completed','cancelled','refused'].includes(p.status))throw Error('没有待取消的后续阶段');p.status='cancelled';p.cancelledAt=now(state);for(const s of p.stages.filter(v=>v.status!=='completed')){s.status='cancelled';const a=state.世界.longActions?.find(v=>v.id===s.actionId);if(a){a.status='cancelled';a.cancelledSourceId=id;a.cancelledAt=clone(state.世界.时间);}}return {planId:p.id,completedStages:p.stageIndex,summary:'已取消剩余阶段，已完成的变化和支出保留。'};});}
 function validateLongAction(state,a,seen){if(seen.has(a.id))throw Error('进化修习重复');seen.add(a.id);const p=table(state).plans.find(p=>p.id===a.planId),s=p?.stages[a.stageIndex];if(!p||!s||p.actorId!==a.ownerId||s.actionId!==a.id||a.requestedMinutes!==s.minutes||a.remainingMinutes+a.minutesExecuted!==a.requestedMinutes||a.steps.reduce((n,s)=>n+s.minutes,0)!==a.minutesExecuted||a.minutesExecuted<0||a.remainingMinutes<0||!['interrupted','completed','cancelled'].includes(a.status))throw Error('进化修习进度无效');}
 function validateSoul(state,soul){
  const timeline=soul.扩展?.structureTimeline;if(!timeline)return null;
  try{const base=core().finalizeDraft(timeline.base,{budget:999999,id:soul.id});let current={...clone(soul),扩展:{...clone(soul.扩展),结构化武魂:base}};for(const row of timeline.events){if(row.kind==='expression'){const g=clone(row.growth);delete g.profileId;delete g.sourceId;const p=state.魂兽档案.列表[row.growth.profileId],op=state.魂环.operations?.[row.growth.sourceId],ring=state.魂环.列表[op?.receipt?.ringId];if(op?.kind!=='absorb'||ring?.武魂ID!==soul.id||hash(ring.扩展?.expressionGrowth)!==hash(row.growth))throw Error('武魂成长缺少实际魂环支出');const B=effects().calculateRingBudget(p,current,op.receipt.compatibility.ratio).usable,b=op.receipt.budget;if(b.available!==B||b.expressionCost!==g.cost||b.totalSpent!==g.cost+b.spent||b.totalSpent>B||ring.价值.表达成长!==g.cost)throw Error('武魂成长与冻结魂环预算不符');current=root.SoulCanonicalGrowth.replayExpression(current,g,p).soul;}else{const e=table(state).events.find(v=>v.id===row.eventId);if(!e||e.soulId!==soul.id||hash(e.before)!==hash(definition(current)))throw Error('进化阶段的前后结构不连续');current=withDefinition(current,e.after);}}if(hash(definition(current))!==hash(definition(soul)))throw Error('武魂结构与已完成变化不一致');return [];}catch(e){return [e.message];}
 }
 function validate(state){const errors=[];if(!state.扩展?.soulEvolution)return errors;try{
  const db=table(state);if(db.version!==VERSION)throw Error('武魂进化记录版本无效');let previous=null;const ids=new Set(),spentGrants=new Set();
  for(const e of db.events){const copy=clone(e);delete copy.hash;if(ids.has(e.id)||e.hash!==hash(copy)||e.previousHash!==previous)throw Error('进化记录不完整');ids.add(e.id);previous=e.hash;
   const soul=state.武魂.列表[e.soulId],next=withDefinition(soul,e.after),charges=clone(diff(e.before,e.after).charges);
   if(e.repairLimit){const prior=db.plans.find(p=>p.id===e.planId)?.stages[e.stageIndex]?.charges.find(c=>c.key==='repair:limit');if(!prior||prior.id!=='growth-ceiling'||prior.points!==5)throw Error('成长限制修复费用无效');charges.push(clone(prior));}
   const sources=e.allocation.consumed.map(src=>({...src,value:src.quantity*src.unitValue}));
   for(const src of sources){if(src.ownerId!==e.payerId||src.quantity<1||src.value<=0||src.type==='material'&&(src.fingerprint!==src.proof?.fingerprint||src.id!=='material:'+src.fingerprint||src.unitValue!==src.proof.unitValue||src.quantity>src.proof.quantity||hash(src.evidence)!==hash(materialEvidence(state,src.proof))))throw Error('进化材料来源或所有权无效');if(src.type!=='material'){const g=db.grants.find(g=>g.id===src.grantId),lot=g?.lots?.[Number(src.id.split(':').at(-1))]??g;if(!g||g.consumedBy!==e.id||!lot||src.unitValue!==lot.value||hash(src.evidence)!==hash(lot.evidence))throw Error('成长力量缺少真实支出');const key=src.id;if(spentGrants.has(key))throw Error('同一成长力量不能重复使用');spentGrants.add(key);}}
   for(const choice of e.rings){const ring=state.魂环.列表[choice.ringId],old=choice.previousSkillIds.map(id=>state.技能.列表[id]);if(!ring||ring.武魂ID!==e.soulId||old.some(s=>!s)||!['keep','rebuild','seal','restore'].includes(choice.mode))throw Error('魂环处理来源无效');if(choice.mode==='rebuild'){if(choice.skills.length!==old.length)throw Error('重构改变了魂环技能数量');const rebuilt=choice.skills.map((k,i)=>rebuildSkill(state,ring,old[i],next,sources,{name:k.name,description:k.description,effects:k.effectGraph.nodes.map(n=>[n.effectId,n.params])},k.id));if(rebuilt.some((k,i)=>hash(k.effectGraph)!==hash(choice.skills[i].effectGraph)||k.budget.spent!==choice.skills[i].budget.spent||!root.SoulAbilityContract.verify(choice.skills[i]).pass)||rebuilt.reduce((n,k)=>n+k.budget.spent,0)>ringBudget(ring))throw Error('魂技重构与冻结额度不一致');charges.push(...reconstructionCharges(ring,rebuilt,old));}}
   if(hash(charges)!==hash(e.charges))throw Error('进化费用与实际变化不符');const allocation=allocate(sources,charges);if(!allocation.pass||e.allocation.assignments.reduce((n,a)=>n+a.value,0)!==allocation.requiredValue)throw Error('进化缺少实际材料支出');if(soul.扩展?.structureTimeline?.events.filter(r=>r.kind==='evolution'&&r.eventId===e.id).length!==1)throw Error('进化历史没有对应的武魂阶段');
  }
  for(const g of db.grants){if(g.kind==='growth-item'){if(hash(g.lots)!==hash(g.materialProof.map(s=>({value:s.value,evidence:s.evidence})))||db.operations[g.craftSourceId]?.receipt.grantId!==g.id)throw Error('成长丹药与实际炼制来源不一致');}else if(g.kind==='inheritance'){const spec=root.SoulEvolutionContent.INHERITANCES.find(s=>s.id===g.inheritanceId);if(!spec||spec.value!==g.value||hash(spec.evidence)!==hash(g.evidence))throw Error('传承力量尚未登记');}else throw Error('未知永久成长来源');if(g.consumedBy&&!ids.has(g.consumedBy))throw Error('成长物品缺少完成的进化记录');}
  for(const p of db.plans){if(!state.武魂.列表[p.soulId]||p.stageIndex<0||p.stageIndex>p.stages.length||p.acceptedBy&&p.acceptedBy!==p.actorId)throw Error('进化方案归属无效');for(const s of p.stages)if(s.status==='completed'&&!ids.has(s.completedEventId))throw Error('进化阶段缺少完成记录');}
 }catch(e){errors.push(e.message);}return errors;}
 function acquireSource(raw,input,id){return transact(raw,input,id,'acquire-source',state=>{const actorId=state.角色.主控单位ID,person=state.人物.列表[actorId],spec=root.SoulEvolutionContent.SOURCES.find(s=>s.id===input.sourceId),quantity=input.quantity??1,mode=input.mode??'buy';if(!spec||!Number.isSafeInteger(quantity)||quantity<1||quantity>50||!['buy','gather'].includes(mode))throw Error('请选择一种材料与实际数量');const reason=world().worldActionBlockReason(state);if(reason)throw Error(reason);let gold=0,minutes=0;
   if(mode==='buy'){if(!spec.places.includes(person.locationId))throw Error('这里没有出售这种材料，请按材料目录前往取材');const wallet=state.钱包.列表[person.walletId];gold=spec.value*quantity;if(wallet.gold<gold)throw Error('金魂币不足');wallet.gold-=gold;}
   else{if(!spec.gatherAt||person.locationId!==spec.gatherAt)throw Error('请先到材料生长或散落的地点');if(quantity>8)throw Error('一次采集最多八份');const day=state.世界.时间.day,used=Object.values(table(state).operations).filter(o=>o.kind==='acquire-source'&&o.receipt.mode==='gather'&&o.receipt.day===day&&o.receipt.sourceKindId===spec.id).reduce((n,o)=>n+o.receipt.quantity,0);if(used+quantity>8)throw Error('此处今日可取得的材料已经采完');const action={id:'gather:'+id,kind:'evolution',ownerId:actorId,interruptions:[]},advanced=world().advanceLongTime(state,action,now(state)+15*quantity);minutes=advanced.minutes;if(advanced.interruption)return {actorId,mode,sourceKindId:spec.id,day,quantity:0,minutes,summary:'采集途中被打断，本次尚未取得材料。'};}
   const profile={sourceGroup:'evolution-source:'+spec.id,displayName:spec.name,categories:spec.categories,attributeSpectrum:{[spec.attribute]:60},channels:spec.channels.filter(name=>Object.values(core().CHANNEL_REGISTRY).some(c=>c.name===name)),traits:spec.traits??[],unitValue:spec.value};const m=world().addPermanentMaterialStack(state,profile,'普通',quantity,{type:'evolution-source-acquired',sourceId:id,mode,locationId:person.locationId},actorId);return {actorId,mode,sourceKindId:spec.id,day:state.世界.时间.day,quantity,gold,minutes,fingerprint:m.fingerprint,summary:'取得'+spec.name+' × '+quantity+'。'};
  });}
 function brew(raw,input,id){return transact(raw,input,id,'brew',state=>{const actorId=state.角色.主控单位ID,access=root.SoulExpeditionEngine.previewWorkshopAccess(state);if(!access.available)throw Error(access.reason);const sources=selectSources(state,actorId,input.sources);if(!sources.length||sources.some(s=>s.type!=='material'))throw Error('请选择实际材料炼制成长丹药');const advance=world().advanceLongTime(state,{id:'brew:'+id,kind:'evolution',ownerId:actorId,interruptions:[]},now(state)+30);if(advance.interruption)return {actorId,completed:false,minutes:advance.minutes,summary:'炼制准备被打断，材料尚未投入。'};const lots=sources.map(s=>({value:s.value,evidence:clone(s.evidence)}));consume(state,{consumed:sources},id);const grant={id:'growth-item:'+id,kind:'growth-item',name:String(input.name??'凝源丹').slice(0,24),ownerId:actorId,lots,craftSourceId:id,materialProof:clone(sources),createdAt:now(state)};const item=world().createItem(state,'evolution-elixir',actorId,state.人物.列表[actorId].inventoryContainerId,{name:grant.name,forceUnique:true,payload:{growthSourceId:grant.id},provenance:{type:'evolution-brew',sourceId:id}});grant.itemId=item.id;mutable(state).grants.push(grant);return {actorId,grantId:grant.id,itemId:item.id,lots,summary:grant.name+'炼成，可在进化修习完成时服用。'};});}
 function registerInheritance(state,inheritanceId,ownerId,sourceId){const spec=root.SoulEvolutionContent.INHERITANCES.find(r=>r.id===inheritanceId),person=state.人物.列表[ownerId];if(!spec||!person)throw Error('传承或持有人未登记');const id='inheritance:'+sourceId+':'+inheritanceId;if(table(state).grants.some(g=>g.id===id))return table(state).grants.find(g=>g.id===id);const item=world().createItem(state,'martial-inheritance',ownerId,person.inventoryContainerId,{name:spec.name,forceUnique:true,payload:{growthSourceId:id},provenance:{type:'registered-inheritance',sourceId,inheritanceId}});const grant={id,kind:'inheritance',inheritanceId,name:spec.name,ownerId,itemId:item.id,value:spec.value,evidence:clone(spec.evidence),sourceId,createdAt:now(state)};mutable(state).grants.push(grant);return grant;}
 function planRingExpression(soul,target,profile){const before=definition(soul),next=withDefinition(soul,target),change=diff(before,definition(next)),lineage=root.SoulCombatFoundation.BEAST_VALUE.validateLineage(profile.血脉).compiled,evidence={attributes:lineage.definition.attributes.map(a=>a.id),channels:lineage.definition.channels,categories:lineage.definition.categories,traits:lineage.definition.traits.map(t=>t.templateId)};if(change.crossType&&(before.categories.some(id=>!definition(next).categories.includes(id))||hash(before.baseAction)!==hash(definition(next).baseAction)))throw Error('新魂环先建立过渡结构，完成转型需要后续阶段');if(change.charges.some(c=>!supports({evidence},c)))throw Error('这枚新魂环不能支付所要求的全部武魂变化');return {soul:next,growth:{version:1,kind:'free-evolution',beforeDefinitionHash:hash(before),afterDefinitionHash:hash(definition(next)),after:definition(next),creationPoints:change.points,conversion:20,cost:change.points*20,charges:change.charges}};}
 function replayRingExpression(soul,growth,profile){const result=planRingExpression(soul,growth.after,profile);if(hash(result.growth)!==hash(growth))throw Error('新魂环牵引与所付结构费用不一致');return result;}
 function facts(state,actorId=state.角色.主控单位ID){return {sources:sourceOptions(state,actorId).map(({proof,...s})=>s),plans:clone(table(state).plans.filter(p=>p.actorId===actorId||p.payerId===actorId)),conversion:MATERIAL_CONVERSION,minutesPerPoint:MINUTES_PER_POINT};}
 return Object.freeze({VERSION,MATERIAL_CONVERSION,MINUTES_PER_POINT,table,definition,withDefinition,diff,splitStages,materialEvidence,sourceOptions,selectSources,supports,allocate,preview,adopt,respond,progress,progressPreview,cancel,acquireSource,brew,registerInheritance,planRingExpression,replayRingExpression,validate,validateSoul,validateLongAction,facts,compatible,stateKey});
});
