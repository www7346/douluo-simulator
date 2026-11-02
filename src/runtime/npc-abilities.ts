import {rules} from '../rules';

const hash=(value:any)=>rules.abilities.hash(value);
const kinds=['use-field-ability','request-ability-use'];
function disguiseOperations(state:any,actorId:string,available:(intent:any)=>boolean){
 const choices=rules.disguise.options(state,actorId).filter((q:any)=>q.available).map((q:any)=>({intent:q.action,name:'解除本人施放的伪装'}));
 const intent={type:'disclose-identity',actorId};if(available(intent))choices.push({intent,name:'向当前听众说明真实身份'});
 return choices.map(({intent,name}:any)=>({optionId:hash([intent,'disguise-operation']),skillName:name,description:name,action:name,targetId:actorId,targetName:state.人物.列表[actorId].name,intent,contract:null,operation:'disguise',effects:[]}));
}
/** The decision selects a real owned source and a currently legal world action. */
export function npcAbilityOptions(state:any,actorId:string,available=rules.world.intentAvailability(state)){
 const actor=state.战斗单位?.列表?.[actorId];
 if(!actor||actorId===state.角色?.主控单位ID||!state.人物?.列表?.[actorId]||rules.actions.battleOf(state,actorId))return [];
 const result:any[]=disguiseOperations(state,actorId,available),seen=new Set<string>(),proposals:any[]=[],requests=rules.world.abilityUseTable(state).requests,now=rules.people.now(state);
 const targets=(Object.values(state.人物.列表) as any[]).filter(person=>{
  const unit=state.战斗单位.列表[person.id];return !!unit&&person.status!=='dead'&&unit.存活状态!=='死亡'&&rules.actions.colocated(state,actorId,person.id);
 });
 const base=rules.combat.martialBaseSkill(actor);
 for(const skill of [...(actor.能力?.技能ID??[]).map((id:string)=>state.技能.列表[id]),...(base?.mode==='disguise'?[base]:[])]){
  const skillId=skill?.id;if(!skill||!rules.abilities.verify(skill).pass||!rules.abilities.fieldControlGraph(skill.effectGraph))continue;
  const modes=skill.castModes?.length?skill.castModes.map((mode:any)=>mode.id):[undefined];
  const eligible=rules.abilities.fieldBranches(skill.effectGraph,{indivisible:!!skill.medicine||skill.sourceKind==='consumable'}),groups=skill.medicine||skill.sourceKind==='consumable'?[eligible]:eligible.map((b:any)=>[b]);
  for(const group of groups){
   if(!group.length)continue;const branchIds=group.map((b:any)=>b.id),nodes=group.flatMap((b:any)=>b.nodes);
   for(const modeId of modes)for(const target of targets){
    if(skill.sourceKind!=='consumable'&&nodes.some((node:any)=>node.effectId==='target.self')&&target.id!==actorId)continue;
    const itemNode=nodes.find((n:any)=>['payload.repair_item','payload.fabricate'].includes(n.effectId));
    const choices=itemNode?rules.creation.itemChoices(state,actorId,target.id,itemNode):[null];
    for(const choice of choices){
     const selection=choice?(choice.targetItemId?{targetItemId:choice.targetItemId}:choice.recipeId?{recipeId:choice.recipeId}:{blueprintId:choice.blueprintId}):{};
     const intent={type:'use-field-ability',actorId,skillId,targetId:target.id,branchIds,...(modeId?{modeId}:{}),...selection,...(itemNode?{materials:(Object.values(rules.expedition.personMaterials(state,actorId)) as any[]).map((m:any)=>({fingerprint:m.fingerprint,quantity:m.quantity})),...(itemNode.effectId==='payload.fabricate'?{quantity:1}:{})}:{})};
     const scope=rules.creation.normalizeScope(skill,intent),prior=requests.filter((r:any)=>r.actorId===actorId&&r.targetId===target.id&&r.skillId===skillId&&r.scopeHash===hash(scope)&&r.expiresAt>now).at(-1);
     if(prior?.status==='rejected')continue;
     proposals.push({skill,target,nodes,prior,intent});
    }
   }
  }
 }
 if(!proposals.length)return result;
 const quotes=rules.world.previewFieldIntents(state,proposals.map(p=>p.intent));
 const requestInputs:any[]=[],requestIndices=new Map<number,number>(),requestKeys=new Map<string,number>();
 for(const [index,{skill,target,prior,intent}] of proposals.entries()){
  if(quotes[index].available||target.id===actorId||prior?.status==='pending'||prior?.status==='accepted')continue;
  try{if(rules.world.abilityApplicationAuthority(state,actorId,target.id,skill,intent).available)continue;rules.combat.quoteSkillUse(state,actor,skill,{fieldUse:true,modeId:intent.modeId,branchIds:intent.branchIds,nodeIds:rules.abilities.selectFieldBranches(skill,intent.branchIds).flatMap((b:any)=>b.nodes.map((n:any)=>n.id)),targetIds:[target.id]});}catch{continue;}
  const request={...intent,type:'request-ability-use'},key=hash(request);
  let requestIndex=requestKeys.get(key);
  if(requestIndex===undefined){requestIndex=requestInputs.length;requestKeys.set(key,requestIndex);requestInputs.push(request);}
  requestIndices.set(index,requestIndex);
 }
 const requestQuotes=requestInputs.length?rules.world.previewAbilityRequests(state,requestInputs):[];
 for(const [index,proposal] of proposals.entries()){
   const {skill,target}=proposal,skillId=skill.id,quote=quotes[index];let intent=proposal.intent;
   if(!quote.available){
    const requestIndex=requestIndices.get(index);if(requestIndex===undefined||!requestQuotes[requestIndex].available)continue;
    intent=requestInputs[requestIndex];
   }
   const optionId=hash([intent,rules.abilities.fingerprint(skill)]);if(seen.has(optionId))continue;seen.add(optionId);
   result.push({optionId,skillId,skillName:skill.name??skillId,description:globalThis.SoulSkillProse.description(skill,state),targetId:target.id,targetName:target.name,
    action:intent.type==='use-field-ability'?'实际施放':'先征询本人意愿',effects:proposal.nodes.filter((n:any)=>!['release','targeting','check'].includes(n.family)).map((n:any)=>({name:rules.effects.EFFECT_REGISTRY[n.effectId]?.displayName??n.effectId,params:structuredClone(n.params)})),
    ...(quote.available?{payment:structuredClone(quote.payment),creationQuotes:structuredClone(quote.creationQuotes??[])}:{}),intent,contract:structuredClone(skill)});
 }
 return result;
}
export function validateNpcAbilityDecision(value:any){
 if(!value||Object.keys(value).some(key=>!['kind','motive','optionId'].includes(key))||value.kind!=='ability'||typeof value.motive!=='string'||!value.motive.trim()||value.motive.length>400||typeof value.optionId!=='string'||!value.optionId)throw Error('能力决定须引用本人当前可执行的选项，并说明本人理由');
 return structuredClone(value);
}
export function applyNpcAbilityDecision(state:any,job:any,choice:any,sourceId:string){
 const option=npcAbilityOptions(state,job.ownerId).find(option=>option.optionId===choice.optionId);
 if(!option)throw Error('这项能力、目标或施放条件已经变化，请由本人重新决定');
 const transactionId='npc-ability:'+sourceId,result=rules.world.settleIntent(state,{...option.intent,id:transactionId});
 const record={requestId:job.id,decisionSourceId:sourceId,decision:structuredClone(choice),intent:option.intent,contract:option.contract,...(option.operation?{operation:option.operation}:{}),receipt:structuredClone(result.receipt)};
 return {...result,goalFields:{abilityUse:{...record,hash:hash(record)}}};
}
export function validateNpcAbilityGoals(state:any){
 for(const goal of state.世界?.npcGoals??[]){
  if(goal.kind!=='ability')continue;
  const job=state.世界.npcDecisions.find((j:any)=>j.id===goal.requestId),record=goal.abilityUse;
  if(!record)throw Error('人物能力决定缺少实际施放或请求记录');
  const {hash:digest,...body}=record,choice=validateNpcAbilityDecision(job?.decision),intent=record.intent,receipt=record.receipt;
  if(record.operation==='disguise'){
   const original=state.世界.processedTransactions?.[receipt.id],episode=intent.type==='dismiss-disguise'?Object.values(state.扩展?.disguises?.episodes??{}).find((r:any)=>r.sourceStatusId===intent.statusId) as any:null;
   if(digest!==hash(body)||hash(choice)!==hash(record.decision)||goal.status!=='completed'||job.status!=='decided'||record.requestId!==job.id||record.decisionSourceId!==goal.decisionSourceId||job.decisionSourceId!==goal.decisionSourceId||goal.ownerId!==intent.actorId||!['dismiss-disguise','disclose-identity'].includes(intent.type)||Object.keys(intent).some(k=>!['type','actorId','statusId'].includes(k))||choice.optionId!==hash([intent,'disguise-operation'])||record.contract!==null||receipt.id!=='npc-ability:'+goal.decisionSourceId||receipt.actorId!==goal.ownerId||receipt.type!==intent.type||original&&hash(original)!==hash(receipt)||!rules.personContracts.table(state).actions.some((a:any)=>a.kind==='disguise'&&a.sourceId===receipt.id&&a.actorId===goal.ownerId)||intent.type==='dismiss-disguise'&&(!episode||episode.actorId!==goal.ownerId||!episode.endedOrder)||intent.type==='disclose-identity'&&!(state.扩展?.disguises?.observations??[]).some((e:any)=>e.id==='disguise:name:'+receipt.id&&e.targetId===goal.ownerId))throw Error('人物伪装决定缺少本人正式操作与原始结算');
   continue;
  }
  if(digest!==hash(body)||hash(choice)!==hash(record.decision)||goal.status!=='completed'||job.status!=='decided'||job.decisionSourceId!==goal.decisionSourceId||record.requestId!==job.id||record.decisionSourceId!==goal.decisionSourceId||goal.ownerId!==intent.actorId||!kinds.includes(intent.type)||Object.keys(intent).some(k=>!['type','actorId','skillId','targetId','modeId','branchIds','targetItemId','recipeId','blueprintId','materials','quantity'].includes(k))||choice.optionId!==hash([intent,rules.abilities.fingerprint(record.contract)])||record.contract.id!==intent.skillId||record.contract.持有者单位ID!==goal.ownerId||!rules.abilities.verify(record.contract).pass||receipt.id!=='npc-ability:'+goal.decisionSourceId||receipt.actorId!==goal.ownerId||receipt.skillId!==intent.skillId||receipt.targetId!==intent.targetId)throw Error('人物能力记录与本人原决定、实际来源或结算不符');
  const original=state.世界.processedTransactions?.[receipt.id];
  if(original&&hash(original)!==hash(receipt))throw Error('人物能力记录与原始结算回执不符');
  if(intent.type==='request-ability-use'){
   const request=rules.world.abilityUseTable(state).requests.find((r:any)=>r.id===receipt.permissionId);
   if(receipt.type!=='ability-use-requested'||!request||request.actorId!==goal.ownerId||request.targetId!==intent.targetId||request.skillId!==intent.skillId||request.contractHash!==rules.abilities.fingerprint(record.contract))throw Error('人物能力请求缺少原始许可记录');
  }else if(hash(receipt.scope)!==hash(rules.creation.normalizeScope(record.contract,intent))||receipt.type!=='field-ability-used'||receipt.payment?.operationId!==receipt.id||receipt.payment?.actorId!==goal.ownerId||receipt.payment?.skillId!==intent.skillId||receipt.payment?.contract?.skillId!==intent.skillId)throw Error('人物能力施放缺少实际付款结算');
 }
}
