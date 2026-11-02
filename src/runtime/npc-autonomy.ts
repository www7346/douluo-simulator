import {narrativeKnowledgeFact} from './narrative-practice';
import {npcPartnerCandidates} from './npc-partner-candidates';
import {validateNpcDeviceDecision,applyNpcDeviceDecision,validateNpcDeviceGoals} from './npc-devices';
import {settleNpcWearable,validateNpcWearableUse} from './npc-wearables';
import {validateNpcAbilityDecision,applyNpcAbilityDecision,validateNpcAbilityGoals} from './npc-abilities';
import {validateNpcCommerceDecision,applyNpcCommerceDecision,validateNpcCommerceGoals} from './npc-commerce';
import {decideRelease} from './story-captivity';
import {rules} from '../rules';
import {contactStoryPerson} from './story-communication';
import {validateNpcPurchases} from './npc-purchases';
import {validateNpcWorkshopDecision,applyNpcWorkshopDecision,validateNpcWorkshopGoals} from './npc-research';
import {validatePersonResearchOperations} from './person-research';
import {npcWorldMinute,pendingNpcDecisions,deferredNpcDecisions,visibleNpcGoals,npcCollaborationFacts} from '../shared/npc-autonomy';

export function npcDecisionWindow(state:any,kind:'visit'|'supply-trip'|'expedition'){
 const now=npcWorldMinute(state.世界.时间);
 return {earliestWorldMinute:now+60,latestWorldMinute:now+(kind==='supply-trip'?31:7)*1440};
}

/** This person's actual intimate-device choices: craftable templates, owned and worn devices, defenseless targets. */
export function npcIntimateOptions(state:any,ownerId:string,available=rules.world.intentAvailability(state)){
 const core=globalThis.SoulIntimateCore;if(!core)return null;
 const person=state.人物?.列表?.[ownerId];if(!person)return null;
 const neutralWorn=Object.values(state.物品?.实例??{}).filter((item:any)=>rules.wearables.registered(item)&&item.attachment).filter((item:any)=>available({type:'intimate-detach',actorId:ownerId,itemId:item.id})).map((item:any)=>({id:item.id,name:item.name,templateId:item.templateId,level:0,wearerId:item.attachment.wearerId}));
 const worn=[...core.worn(state,ownerId),...neutralWorn],ownedCandidates=Object.values(state.物品?.实例??{}).filter((item:any)=>core.DEVICES[item.templateId]&&!item.attachment&&item.ownerEntityId===ownerId);
 const walletId=person.walletId,gold=state.钱包?.列表?.[walletId]?.gold??0;
 const targets=Object.values(state.人物?.列表??{}).filter((other:any)=>other.status!=='dead'&&rules.actions.colocated(state,ownerId,other.id)&&(other.id===ownerId||core.defenseless(state,other.id,{custody:false,defeat:false}).ok)).map((other:any)=>({id:other.id,name:other.name,self:other.id===ownerId}));
 const owned=ownedCandidates.filter((item:any)=>!rules.wearables.registered(item)||targets.some((target:any)=>available({type:'intimate-equip',actorId:ownerId,itemId:item.id,targetId:target.id,forced:!target.self})));
 const affordable=Object.entries(core.DEVICES).filter(([id,device]:any)=>gold>=device.price&&(!rules.wearables.registered(id)||available({type:'intimate-craft',actorId:ownerId,templateId:id}))).map(([id,device]:any)=>({templateId:id,name:device.name,price:device.price}));
 const hosts=Object.values(state.物品?.实例??{}).filter((item:any)=>{
  try{return !!rules.host.carrier(state,item)&&rules.host.controller(item,ownerId,state)&&rules.host.actions(state,item,ownerId).some((action:any)=>action.available);}catch{return false;}
 }).map((item:any)=>({itemId:item.id,name:item.name,suppression:rules.host.read(item).capabilities.suppression?.percent??null,forms:rules.host.formFacts(rules.host.read(item)),actions:rules.host.actions(state,item,ownerId)}));
 if(!worn.length&&!owned.length&&!affordable.length&&!hosts.length)return null;
 return {gold,craft:affordable,owned:owned.map((item:any)=>({itemId:item.id,name:item.name})),worn:worn.map((entry:any)=>({itemId:entry.id,name:entry.name,level:entry.level,max:core.DEVICES[entry.templateId].maxStimLevel,...(entry.wearerId?{wearerId:entry.wearerId}:{})})),targets,hosts,hostForms:Object.entries(rules.host.FORM_REGISTRY).map(([id,definition]:any)=>({id,name:definition.name,slots:definition.slots,maxLevel:definition.maxLevel}))};
}


/** Choices over this person's existing observations and actual available listeners. */
export function npcCustodyNewsOptions(state:any,ownerId:string,available=rules.world.intentAvailability(state)){
 const social=rules.social.facts(state,ownerId),facts=social.knowledge.map((k:any)=>narrativeKnowledgeFact(k.fact));
 if(!facts.length)return {facts:[],recipients:[]};
 const recipients=social.nearby.filter((p:any)=>available({type:'tell-custody-news',actorId:ownerId,targetId:p.id,factIds:[facts[0].id]})).map((p:any)=>({id:p.id,name:p.name}));
 return recipients.length?{facts,recipients}:{facts:[],recipients:[]};
}

/** Consent is issued by this person; feasibility uses the actual assignment rules. */
export function npcCustodyDutyOptions(state:any,ownerId:string){
 const options:any[]=[],owner=state.人物.列表[ownerId];if(!owner||ownerId===state.角色.主控单位ID)return options;
 const custody=rules.custody.table(state),facilities=custody.facilities??[];
 if(!facilities.length&&!Object.keys(custody.byPerson).length)return options;
 for(const leader of Object.values(state.人物.列表) as any[]){
  if(leader.id===ownerId||!rules.actions.colocated(state,ownerId,leader.id))continue;
  for(const mode of ['guard','escort'])try{
   const posts=facilities.filter((f:any)=>f.status==='active'&&f.operatorIds.includes(leader.id));
   const targets=Object.values(custody.byPerson).filter((r:any)=>r.custodianId===leader.id&&r.arrangement==='held-at-scene'&&rules.custody.active(state,r.personId)).map((r:any)=>r.personId);
   if(mode==='guard'?!posts.length:!targets.length)continue;
   const sourceId=`npc-duty-option:${ownerId}:${leader.id}:${mode}`;
   const permitted=rules.world.settleIntent(structuredClone(state),{id:sourceId,type:'permit-custody-duty',actorId:ownerId,targetId:leader.id,mode}).state;
   if(mode==='guard'){
    const eligible=posts.filter((f:any)=>{try{rules.world.settleIntent(permitted,{id:`${sourceId}:assign:${f.id}`,type:'assign-custody-guard',actorId:leader.id,targetId:ownerId,facilityId:f.id});return true;}catch{return false;}});
    if(eligible.length)options.push({leaderId:leader.id,leaderName:leader.name,mode,facilities:eligible.map((f:any)=>({id:f.id,name:f.name})),meaning:'同意接受一次看守安排，许可15分钟有效；实际到场后才能开始值守。'});
   }else{
    const f=rules.logistics.facts(state,leader.id);
    const possible=f.destinations.some((d:any)=>{try{rules.world.settleIntent(permitted,{id:`${sourceId}:escort:${d.id}`,type:'start-custody-escort',actorId:leader.id,targetIds:targets,guardIds:[ownerId],destinationId:d.id});return true;}catch{return false;}});
    if(possible)options.push({leaderId:leader.id,leaderName:leader.name,mode,meaning:'仅同意一次护送安排，许可15分钟有效；尚未出发，按实际路线与原看管权限结算。'});
   }
  }catch{/* An unavailable actual duty is not offered to the person. */}
 }
 return options;
}

export function requestNpcDecision(state:any,characterId:string,sourceId:string){
 const met=contactStoryPerson(state,characterId);state=met.state;const ownerId=met.receipt.personId,now=npcWorldMinute(state.世界.时间);
 const prior=(state.世界.npcGoals??[]).findLast((g:any)=>g.ownerId===ownerId);
 if(prior&&(['visit','supply-trip','expedition'].includes(prior.kind)&&['active','arrived'].includes(prior.status)||prior.reconsiderAfter>now))return {state,receipt:{type:'npc-goal-existing',goal:visibleNpcGoals(state,ownerId).at(-1),summary:'对方已有自己的安排，继续按原计划行动。'}};
 if(rules.expeditionContext.forActor(state,ownerId,{presentOnly:false}))throw Error('对方已有尚未结束的远征');
 if((state.世界.npcPlans??[]).some((p:any)=>p.ownerId===ownerId&&['scheduled','travelling','waiting'].includes(p.status)))return {state,receipt:{type:'npc-goal-existing',personId:ownerId,summary:'对方已有尚未结束的行程，先沿用原安排。'}};
 if((state.远征?.companionContracts??[]).some((c:any)=>c.unitId===ownerId))throw Error('对方正在履行同行合同，不能另外安排独立行程');
 const turn=state.扩展.story.active,existing=(state.世界.npcDecisions??[]).find((r:any)=>r.id===sourceId);
 if(existing)throw Error('这次人物考虑已经登记');
 if((state.世界.npcDecisions??[]).some((r:any)=>r.branchId===state.扩展.story.branchId&&r.turn===turn.number))throw Error('这一回合已有一位人物独立考虑打算，请先完成当前交谈');
 (state.世界.npcDecisions??=[]).push({id:sourceId,ownerId,branchId:state.扩展.story.branchId,turn:turn.number,createdAt:structuredClone(state.世界.时间),status:'pending'});
 return {state,receipt:{type:'npc-goal-requested',requestId:sourceId,personId:ownerId,summary:'正在听取对方接下来的打算。'}};
}
export function validateNpcDecision(value:any){
 if(value?.kind==='device')return validateNpcDeviceDecision(value);
 if(value?.kind==='ability')return validateNpcAbilityDecision(value);
 if(value?.kind==='commerce')return validateNpcCommerceDecision(value);
 if(['research','craft'].includes(value?.kind))return validateNpcWorkshopDecision(value);
 if(value?.kind==='permit-custody-duty'){
  if(Object.keys(value).some(k=>!['kind','motive','targetId','mode'].includes(k))||typeof value.motive!=='string'||!value.motive.trim()||value.motive.length>400||typeof value.targetId!=='string'||!value.targetId||!['guard','escort'].includes(value.mode))throw Error('职责同意须指定本人理由、实际领队和看守或护送职责');
  return structuredClone(value);
 }
 if(value?.kind==='tell-custody-news'){
  if(Object.keys(value).some(k=>!['kind','motive','targetId','factIds'].includes(k))||typeof value.motive!=='string'||!value.motive.trim()||value.motive.length>400||typeof value.targetId!=='string'||!value.targetId||!Array.isArray(value.factIds)||!value.factIds.length||value.factIds.length>8||value.factIds.some((id:any)=>typeof id!=='string'||!id)||new Set(value.factIds).size!==value.factIds.length)throw Error('转告须指定本人理由、实际听者和1至8条不重复的已知事件');
  return structuredClone(value);
 }
 if(value?.kind==='intimate'){
  const fields=['kind','motive','action','templateId','itemId','targetId','level','percent','slot','formId','preset'];
  if(Object.keys(value).some(k=>!fields.includes(k))||typeof value.motive!=='string'||!value.motive.trim()||value.motive.length>400||!['craft','equip','level','detach','urinate','host-suppression','host-form','host-appearance'].includes(value.action))throw Error('情具安排须指定实际动作、制式、器具、目标或档位');
  if(value.action==='craft'&&(typeof value.templateId!=='string'||!value.templateId))throw Error('制作情具须指定制式');
  if(['equip','level','detach'].includes(value.action)&&(typeof value.itemId!=='string'||!value.itemId))throw Error('须指定本人实际持有的情具');
  if(['host-suppression','host-form','host-appearance'].includes(value.action)&&(typeof value.itemId!=='string'||!value.itemId))throw Error('须指定本人控制的宿主装备');
  if(value.action==='host-suppression'&&(!Number.isSafeInteger(value.percent)||value.percent<0||value.percent>100))throw Error('禁魔比例须为0至100整数');
  if(value.action==='host-form'&&(typeof value.slot!=='string'||!value.slot||(value.formId!==undefined&&typeof value.formId!=='string')))throw Error('拟态须指定槽位与实际形态');
  if(value.action==='host-appearance'&&(typeof value.preset!=='string'||!value.preset))throw Error('更换外观须指定预设');
  if(value.action==='equip'&&value.targetId!==undefined&&(typeof value.targetId!=='string'||!value.targetId))throw Error('佩戴目标须为实际人物编号');
  if(value.action==='level'&&(!Number.isSafeInteger(value.level)||value.level<0||value.level>5))throw Error('情具档位须为0至5整数');
  return structuredClone(value);
 }
 if(!value||typeof value!=='object'||Array.isArray(value)||!['idle','visit','supply-trip','expedition','purchase','leave-party'].includes(value.kind))throw Error('人物打算类型无效');
 const fields=['idle','leave-party'].includes(value.kind)?['kind','motive']:value.kind==='purchase'?['kind','motive','templateId','quantity']:value.kind==='expedition'?['kind','motive','dungeonId','difficultyId','day','hour','minute']:value.kind==='supply-trip'?['kind','motive','destinationId','day','hour','minute','templateId','fallback']:['kind','motive','destinationId','day','hour','minute','invitePlayer','partnerId'];
 if(Object.keys(value).some(k=>!fields.includes(k))||typeof value.motive!=='string'||!value.motive.trim()||value.motive.length>400)throw Error('打算只包含已开放条款与简短人物理由');
 if(['visit','supply-trip'].includes(value.kind)&&(typeof value.destinationId!=='string'||!Number.isSafeInteger(value.day)||value.day<1||!Number.isSafeInteger(value.hour)||value.hour<0||value.hour>23||!Number.isSafeInteger(value.minute)||value.minute<0||value.minute>59||value.kind==='visit'&&typeof value.invitePlayer!=='boolean'))throw Error('到访须明确真实地点、世界日期时分及是否邀请玩家');
 if(value.kind==='supply-trip'&&(typeof value.templateId!=='string'||!['go-without','cancel-trip'].includes(value.fallback)))throw Error('补给打算须指定实际物资和自己的后续安排');
 if(value.kind==='purchase'&&(typeof value.templateId!=='string'||!value.templateId||!Number.isSafeInteger(value.quantity)||value.quantity<1||value.quantity>999))throw Error('本人采购须指定实际物品及1至999整数数量');
 if(value.kind==='expedition'&&(typeof value.dungeonId!=='string'||typeof value.difficultyId!=='string'||!Number.isSafeInteger(value.day)||value.day<1||!Number.isSafeInteger(value.hour)||value.hour<0||value.hour>23||!Number.isSafeInteger(value.minute)||value.minute<0||value.minute>59))throw Error('远征须指定真实目的地、难度及抵达日期时分');
 if(value.partnerId!==undefined&&value.partnerId!==null&&(typeof value.partnerId!=='string'||!value.partnerId))throw Error('合作对象须为当前真实人物编号或null');
 return structuredClone(value);
}
export function assertNpcDecisionResponseReady(state:any,job:any){
 rules.influence.assertVoluntary(state,job.ownerId);
 const cooperation=job.kind==='partner-response'?(state.世界.npcCollaborations??[]).find((r:any)=>r.id===job.collaborationId):null;
 if(job.kind==='partner-response'&&(!cooperation||cooperation.status!=='pending'||npcWorldMinute(state.世界.时间)>cooperation.endsAt))throw Error('原同行提议已失效，不能补作过时回应');
 if(job.kind==='seek-partner'){const goal=(state.世界.npcGoals??[]).find((g:any)=>g.id===job.goalId);if(!goal||npcWorldMinute(goal.arriveAt)<=npcWorldMinute(state.世界.时间))throw Error('原同行计划已过时，不能重新续办');}
 rules.social.communicate(state,job.ownerId,cooperation?.initiatorId??state.角色.主控单位ID);
}
export function applyNpcDecision(state:any,input:any,sourceId:string){
 const turn=state.扩展.story.active,job=(input.deferred===true?deferredNpcDecisions(state):pendingNpcDecisions(state)).find(j=>j.id===input.requestId);
 if(!job||input.deferred!==true&&(input.branchId!==state.扩展.story.branchId||input.turn!==turn?.number))throw Error('人物打算的来源或故事回合已变化');
 rules.influence.assertVoluntary(state,job.ownerId);
 if(input.deferred===true)assertNpcDecisionResponseReady(state,job);
 if(job.kind==='release-response')return decideRelease(state,job,input.decision,sourceId,input.deferred===true);
 if(job.kind==='seek-partner'||job.kind==='partner-response')return applyPartnerDecision(state,job,input.decision,sourceId);
 const choice=validateNpcDecision(input.decision),person=state.人物.列表[job.ownerId];
 if(input.deferred!==true)state=contactStoryPerson(state,person.id).state;const actor=state.人物.列表[person.id];
 const now=npcWorldMinute(state.世界.时间),goal:any={id:`npc-goal:${job.id}`,ownerId:person.id,kind:choice.kind,motive:choice.motive,branchId:job.branchId,turn:job.turn,
  requestId:job.id,decisionSourceId:sourceId,createdAt:structuredClone(state.世界.时间),knownBy:[person.id,state.角色.主控单位ID],status:choice.kind==='idle'?'resting':['device','ability','commerce','leave-party','purchase','research','craft','tell-custody-news','permit-custody-duty','intimate'].includes(choice.kind)?'completed':'active',reconsiderAfter:now+6*60};
 if(choice.kind==='device'){const result=applyNpcDeviceDecision(state,job,choice,sourceId);state=result.state;Object.assign(goal,result.goalFields);goal.reconsiderAfter=now;}
 if(choice.kind==='ability'){const result=applyNpcAbilityDecision(state,job,choice,sourceId);state=result.state;Object.assign(goal,result.goalFields);goal.reconsiderAfter=now;}
 if(choice.kind==='intimate'){
  const options=npcIntimateOptions(state,person.id);if(!options)throw Error('本人当前没有可用的情具安排');
  const action=choice.action,id=`npc-intimate:${sourceId}`;
  const settleHost=(intent:any)=>{
   const item=state.物品.实例[choice.itemId],wearerId=rules.host.carrier(state,item)?.personId,frame=rules.host.attributeFrame(state,wearerId);
   frame.人物.列表[person.id]=structuredClone(state.人物.列表[person.id]);frame.战斗单位.列表[person.id]=structuredClone(state.战斗单位.列表[person.id]);
   const result=rules.world.settleIntent(state,{id,actorId:person.id,...intent});
   const record={version:1,requestId:job.id,decisionSourceId:sourceId,decision:structuredClone(choice),intent:{actorId:person.id,...intent},frame,receipt:structuredClone(result.receipt)};
   goal.hostUse={...record,hash:rules.abilities.hash(record)};state=result.state;
  };
  const settleMechanical=(intent:any)=>{
   if(rules.wearables.registered(action==='craft'?choice.templateId:state.物品.实例[choice.itemId])){const result=settleNpcWearable(state,job,choice,sourceId);state=result.state;goal.wearableUse=result.wearableUse;}
   else state=rules.world.settleIntent(state,intent).state;
  };
  if(action==='craft'){
   if(!options.craft.some((entry:any)=>entry.templateId===choice.templateId))throw Error('该制式不在本人当前可支付范围内');
   settleMechanical({id,type:'intimate-craft',actorId:person.id,templateId:choice.templateId});
  }else if(action==='equip'){
   if(!options.owned.some((entry:any)=>entry.itemId===choice.itemId))throw Error('本人没有这件尚未佩戴的情具');
   const targetId=choice.targetId??person.id;
   if(!options.targets.some((entry:any)=>entry.id===targetId))throw Error('该人物不在本人当前可强制或自用的范围内');
   settleMechanical({id,type:'intimate-equip',actorId:person.id,itemId:choice.itemId,targetId,forced:targetId!==person.id,level:choice.level??0});
  }else if(action==='level'){
   if(!options.worn.some((entry:any)=>entry.itemId===choice.itemId))throw Error('本人没有控制这件佩戴中的情具');
   state=rules.world.settleIntent(state,{id,type:'intimate-level',actorId:person.id,itemId:choice.itemId,level:choice.level??0}).state;
  }else if(action==='detach'){
   if(!options.worn.some((entry:any)=>entry.itemId===choice.itemId))throw Error('本人没有可解除的这件情具');
   settleMechanical({id,type:'intimate-detach',actorId:person.id,itemId:choice.itemId});
  }else if(action==='host-suppression'){
   if(!options.hosts?.some((entry:any)=>entry.itemId===choice.itemId))throw Error('本人没有控制这件宿主装备');
   settleHost({type:'host.set-suppression',itemId:choice.itemId,percent:choice.percent});
  }else if(action==='host-form'){
   if(!options.hosts?.some((entry:any)=>entry.itemId===choice.itemId))throw Error('本人没有控制这件宿主装备');
   settleHost({type:'host.set-form',itemId:choice.itemId,slot:choice.slot,formId:choice.formId??'',level:choice.level??0});
  }else if(action==='host-appearance'){
   if(!options.hosts?.some((entry:any)=>entry.itemId===choice.itemId))throw Error('本人没有控制这件宿主装备');
   settleHost({type:'host.set-appearance',itemId:choice.itemId,preset:choice.preset});
  }else state=rules.world.settleIntent(state,{id,type:'intimate-urinate',actorId:person.id}).state;
 }
 if(choice.kind==='permit-custody-duty'){
  if(!npcCustodyDutyOptions(state,person.id).some(o=>o.leaderId===choice.targetId&&o.mode===choice.mode))throw Error('该职责不在本人当前可实际承担的选项中');
  state=rules.world.settleIntent(state,{id:`npc-duty:${sourceId}`,type:'permit-custody-duty',actorId:person.id,targetId:choice.targetId,mode:choice.mode}).state;
 }
 if(choice.kind==='tell-custody-news')state=rules.world.settleIntent(state,{id:`npc-news:${sourceId}`,type:'tell-custody-news',actorId:person.id,targetId:choice.targetId,factIds:choice.factIds}).state;
 if(['research','craft'].includes(choice.kind)){const result=applyNpcWorkshopDecision(state,job,choice,sourceId);state=result.state;Object.assign(goal,result.goalFields);}
 if(choice.kind==='commerce'){const result=applyNpcCommerceDecision(state,job,choice,sourceId);state=result.state;Object.assign(goal,result.goalFields);}
 if(choice.kind==='purchase'){
  goal.purchaseTransactionId=`npc-purchase:${sourceId}`;
  state=rules.expedition.buySupply(state,choice.templateId,choice.quantity,goal.purchaseTransactionId,{actorId:person.id,decisionOrigin:{requestId:job.id,branchId:job.branchId,turn:job.turn,sourceId,decision:choice}}).state;
 }
 if(['visit','supply-trip'].includes(choice.kind)){
  if(!rules.world.npcGoalDestinations(state,person.id).some((d:any)=>d.id===choice.destinationId))throw Error('地点不在人物当前可知且负担得起的去向中');
  goal.destinationId=choice.destinationId;goal.arriveAt={day:choice.day,hour:choice.hour,minute:choice.minute};
  const target=npcWorldMinute(goal.arriveAt),window=npcDecisionWindow(state,choice.kind);if(target<window.earliestWorldMinute||target>window.latestWorldMinute)throw Error('个人到访安排须留至少一小时，并在普通到访七日/补给出行三十一日内');
  goal.reconsiderAfter=Math.max(now+6*60,target+61);
 }
 if(choice.kind==='leave-party'){
  const member=rules.world.partyMembers(state).find((p:any)=>p.personId===person.id);if(!member)throw Error('只有当前自愿成员才能决定离队，雇佣须履行合同');
  const block=rules.world.worldActionBlockReason(state);if(block)throw Error(block);
  goal.membershipId=member.membershipId;
  rules.world.endPartyMembership(state,person.id,member.membershipId,sourceId,person.id,choice.motive);
 }
 if(choice.kind==='expedition'){
  const option=rules.expedition.npcExpeditionOptions(state,person.id).find((o:any)=>o.dungeonId===choice.dungeonId&&o.difficultyId===choice.difficultyId);
  if(!option)throw Error('远征不在本人已知且能实际到达的选项中');
  Object.assign(goal,{dungeonId:choice.dungeonId,difficultyId:choice.difficultyId,destinationId:option.locationId,arriveAt:{day:choice.day,hour:choice.hour,minute:choice.minute}});
  const target=npcWorldMinute(goal.arriveAt),window=npcDecisionWindow(state,'expedition');
  if(target<Math.max(window.earliestWorldMinute,now+option.travelMinutes)||target>window.latestWorldMinute)throw Error('远征须留足实际路途和至少一小时准备，且在七日内出发');
  goal.reconsiderAfter=Math.max(now+360,target+61);
 }
 (state.世界.npcGoals??=[]).push(goal);
 if(['visit','supply-trip','expedition'].includes(choice.kind)){
  const plan=rules.world.createPersonalPlan(state,goal);goal.planId=plan.id;
  if(choice.kind==='supply-trip')rules.world.createNpcSupplyRequest(state,goal,choice.templateId,choice.fallback);
  if(choice.invitePlayer){
   const endsAt=npcWorldMinute(goal.arriveAt)+60;goal.invitationId=`${goal.id}:meeting`;
   const record={id:goal.invitationId,kind:'meeting',initiatorId:person.id,goalId:goal.id,playerId:state.角色.主控单位ID,personId:person.id,locationId:goal.destinationId,
    startsAt:structuredClone(goal.arriveAt),endsAt,dueDay:Math.floor(endsAt/1440),status:'pending',events:[{status:'pending',sourceId,revision:state.系统.revision,time:structuredClone(state.世界.时间),reason:choice.motive}]};
   (actor.扩展.社交约定??=[]).push(record);
  }
 }
 const current=state.世界.npcDecisions.find((j:any)=>j.id===job.id);current.status='decided';current.goalId=goal.id;
 if(['device','ability','commerce','expedition','purchase','research','craft','tell-custody-news','permit-custody-duty'].includes(choice.kind)||goal.hostUse||goal.wearableUse){current.decision=structuredClone(choice);current.decisionSourceId=sourceId;if(choice.kind==='expedition')rules.expedition.recordNpcExpeditionDecision(state,goal);}
 if(choice.kind==='visit'&&choice.partnerId)proposeNpcPartner(state,goal,choice.partnerId,choice.motive,job.id,sourceId);
 const active=state.扩展.story.active,result=active?.status!=='complete'?active?.results.find((r:any)=>r.receipt?.requestId===job.id):null;if(result)result.receipt.goal=visibleNpcGoals(state,person.id).at(-1);
 return {state,receipt:{type:'npc-goal-decided',personId:person.id,goal:visibleNpcGoals(state,person.id).at(-1),summary:goal.deviceUse?'对方已按实际权限完成这次器具操作或判定。':goal.wearableUse?'对方已完成中性器具'+(choice.action==='craft'?'制作':choice.action==='equip'?'装配':'拆卸')+'。':goal.hostUse?(goal.hostUse.receipt.completed?'对方已完成宿主调整。':goal.hostUse.receipt.reason??'宿主调整中断。'):choice.kind==='ability'?(goal.abilityUse.operation==='disguise'?goal.abilityUse.receipt.summary:goal.abilityUse.intent.type==='use-field-ability'?'对方已施放'+goal.abilityUse.contract.name+'。':'对方想使用'+goal.abilityUse.contract.name+'，正等待回应。'):choice.kind==='commerce'?'对方已办妥这次商业事务。':choice.kind==='permit-custody-duty'?'对方同意在15分钟内接受这次职责安排。':choice.kind==='tell-custody-news'?'对方已向所选的人转告这条消息。':choice.kind==='research'?'对方已投入材料，开始研发自己的作品。':choice.kind==='craft'?'对方已按图纸制成了自己的作品。':choice.kind==='purchase'?'对方已到店购得所需物资。':choice.kind==='expedition'?'对方说明了自己的远征计划，接下来会动身前往入口。':choice.kind==='leave-party'?'对方结束了这次同行，队伍空出了一个名额。':choice.kind==='idle'?'对方暂时没有新的打算。':'对方说明了自己的到访安排。'}};
}
export function answerNpcInvitation(state:any,input:any,sourceId:string){
 if(typeof input.accept!=='boolean')throw Error('请明确接受或拒绝这项邀约');
 const goal=(state.世界.npcGoals??[]).find((g:any)=>g.id===input.goalId);if(!goal?.invitationId)throw Error('没有这项人物主动邀约');
 const met=contactStoryPerson(state,goal.ownerId);state=met.state;
 const record=state.人物.列表[goal.ownerId].扩展.社交约定.find((r:any)=>r.id===goal.invitationId);
 if(record.status!=='pending'||npcWorldMinute(state.世界.时间)>record.endsAt)throw Error('这项邀约已回应或过期');
 if(input.accept){
  for(const p of Object.values(state.人物.列表) as any[])for(const r of p.扩展?.社交约定??[])if(r.id!==record.id&&r.kind==='meeting'&&r.status==='accepted'&&npcWorldMinute(r.startsAt)<=record.endsAt&&r.endsAt>=npcWorldMinute(record.startsAt))throw Error('已有时间重叠的约见，请先调整原安排');
 }
 record.status=input.accept?'accepted':'rejected';record.events.push({status:record.status,sourceId,revision:state.系统.revision,time:structuredClone(state.世界.时间),reason:input.accept?'玩家明确答应人物发起的约见':'玩家拒绝约见，人物仍保留个人行程'});
 if(!input.accept&&!goal.partnerSearchId&&!(state.世界.npcCollaborations??[]).some((r:any)=>r.goalId===goal.id)&&npcWorldMinute(goal.arriveAt)>npcWorldMinute(state.世界.时间)&&npcPartnerCandidates(state,goal.ownerId).length){
  goal.partnerSearchId=sourceId;const turn=state.扩展.story.active;
  (state.世界.npcDecisions??=[]).push({id:sourceId,kind:'seek-partner',ownerId:goal.ownerId,goalId:goal.id,branchId:state.扩展.story.branchId,turn:turn.number,createdAt:structuredClone(state.世界.时间),status:'pending'});
  return {state,receipt:{type:'npc-goal-requested',requestId:sourceId,personId:goal.ownerId,commitment:structuredClone(record),summary:'已婉拒邀约，对方会再考虑独行或另找同行者。'}};
 }
 return {state,receipt:{type:'npc-invitation-answered',goalId:goal.id,commitment:structuredClone(record),summary:input.accept?'已答应见面，可以按约定时间赴会。':'已婉拒邀请，对方将另作安排。'}};
}

function collaborationEvent(state:any,r:any,status:string,sourceId:string,reason:string){
 const location=state.人物.列表[r.initiatorId].locationId;
 const knownBy=(Object.values(state.人物.列表) as any[]).filter(p=>p.status!=='dead'&&rules.actions.colocated(state,r.initiatorId,p.id)).map(p=>p.id);
 r.status=status;r.events.push({status,sourceId,time:structuredClone(state.世界.时间),locationId:location,knownBy,reason});
}
function proposeNpcPartner(state:any,goal:any,partnerId:string,motive:string,rootRequestId:string,sourceId:string){
 if(!npcPartnerCandidates(state,goal.ownerId).some(p=>p.id===partnerId))throw Error('只能向当前同地的真实其他人物提议');
 if((state.世界.npcCollaborations??[]).some((r:any)=>r.goalId===goal.id))throw Error('这项计划已经询问过合作对象，不连续催促');
 const id=`npc-collaboration:${rootRequestId}`,record={id,kind:'meeting',goalId:goal.id,initiatorId:goal.ownerId,personId:partnerId,locationId:goal.destinationId,startsAt:structuredClone(goal.arriveAt),endsAt:npcWorldMinute(goal.arriveAt)+60,branchId:state.扩展.story.branchId,motive,status:'pending',events:[] as any[],nextAt:null};
 collaborationEvent(state,record,'pending',sourceId,motive);(state.世界.npcCollaborations??=[]).push(record);
 state.世界.npcDecisions.push({id:`${id}:response`,kind:'partner-response',rootRequestId,ownerId:partnerId,goalId:goal.id,collaborationId:id,branchId:state.扩展.story.branchId,turn:state.扩展.story.active.number,createdAt:structuredClone(state.世界.时间),status:'pending'});
}
function applyPartnerDecision(state:any,job:any,choice:any,sourceId:string){
 if(!choice||typeof choice!=='object'||Array.isArray(choice)||typeof choice.motive!=='string'||!choice.motive.trim()||choice.motive.length>400)throw Error('合作决定须有简短的本人理由');
 const goal=state.世界.npcGoals.find((g:any)=>g.id===job.goalId);
 if(job.kind==='seek-partner'){
  if(Object.keys(choice).some(k=>!['partnerId','motive'].includes(k))||!(choice.partnerId===null||typeof choice.partnerId==='string'))throw Error('另作安排只接受partnerId或null及理由');
  if(choice.partnerId)proposeNpcPartner(state,goal,choice.partnerId,choice.motive,job.id,sourceId);
  job.decision={partnerId:choice.partnerId,motive:choice.motive};
 }else{
  if(Object.keys(choice).some(k=>!['accept','motive'].includes(k))||typeof choice.accept!=='boolean')throw Error('被邀人物须独立接受或拒绝');
  const record=state.世界.npcCollaborations.find((r:any)=>r.id===job.collaborationId);
  if(!record||record.status!=='pending'||!npcPartnerCandidates(state,record.initiatorId).some(p=>p.id===record.personId))throw Error('这项当面合作提议已失效');
  const possible=rules.world.appointmentTravelAvailability(state,record);
  if(choice.accept&&!possible.available)throw Error(`本人无法执行这项合作：${possible.reason}`);
  collaborationEvent(state,record,choice.accept?'accepted':'rejected',sourceId,choice.motive);
  if(choice.accept){record.nextAt=npcWorldMinute(record.startsAt);record.planId=rules.world.createCollaborationPlan(state,record,sourceId).id;}
  job.decision={accept:choice.accept,motive:choice.motive};
 }
 job.status='decided';job.decisionSourceId=sourceId;
 const turn=state.扩展.story.active,result=turn?.status!=='complete'?turn?.results.find((r:any)=>r.receipt?.requestId===(job.rootRequestId??job.id)):null;
 if(result)result.receipt.collaborations=npcCollaborationFacts(state,state.角色.主控单位ID,goal.ownerId);
 const observer=state.人物.列表[state.角色.主控单位ID],speaker=state.人物.列表[job.ownerId];
 if(result&&observer&&speaker&&rules.actions.colocated(state,observer.id,speaker.id))(result.receipt.partnerDecisions??=[]).push({personId:job.ownerId,requestId:job.id,sourceId,observerId:observer.id,locationId:speaker.locationId,time:structuredClone(state.世界.时间),decision:structuredClone(job.decision)});
 return {state,receipt:{type:'npc-partner-decided',personId:job.ownerId,decision:structuredClone(job.decision),summary:'对方已回应这次同行邀请。'}};
}
export function validateNpcAutonomy(state:any){
 validateNpcDeviceGoals(state);validateNpcAbilityGoals(state);
 validateNpcCommerceGoals(state);validateNpcWorkshopGoals(state);validatePersonResearchOperations(state);
 const jobs=state.世界?.npcDecisions,goals=state.世界?.npcGoals;if(jobs===undefined&&goals===undefined&&state.世界?.npcCollaborations===undefined)return;
 if(jobs!==undefined&&!Array.isArray(jobs)||goals!==undefined&&!Array.isArray(goals))throw Error('人物自主记录无效');
 const ids=new Set();for(const j of jobs??[]){if(!j||typeof j.id!=='string'||ids.has(j.id)||!state.人物.列表[j.ownerId]||j.ownerId===state.角色.主控单位ID||!(j.kind==='release-response'?['pending','decided','invalidated']:['pending','decided']).includes(j.status)||typeof j.branchId!=='string'||!Number.isSafeInteger(j.turn)||j.turn<1)throw Error('人物思考来源无效');ids.add(j.id);if(j.status==='decided'&&j.kind!=='release-response'&&!(goals??[]).some((g:any)=>g.id===j.goalId&&(j.kind==='seek-partner'||j.kind==='partner-response'||g.requestId===j.id)))throw Error('人物决定缺少目标');}
 validateNpcCollaborations(state);
 validateNpcPurchases(state);
 const seen=new Set();for(const g of goals??[]){const job=(jobs??[]).find((j:any)=>j.id===g.requestId);if(!job||g.id!==`npc-goal:${job.id}`||g.ownerId!==job.ownerId||seen.has(g.id)||typeof g.decisionSourceId!=='string'||!g.decisionSourceId||typeof g.motive!=='string'||!g.motive||!['device','ability','commerce','idle','visit','supply-trip','expedition','purchase','research','craft','leave-party','tell-custody-news','permit-custody-duty','intimate'].includes(g.kind)||!['resting','active','arrived','completed','blocked','cancelled','missed'].includes(g.status)||!Number.isSafeInteger(g.reconsiderAfter)||!Array.isArray(g.knownBy)||!g.knownBy.includes(g.ownerId))throw Error('人物目标来源或状态无效');seen.add(g.id);
  if(g.kind==='intimate'){
   const choice=validateNpcDecision(job.decision),record=g.hostUse;
   if(['craft','equip','detach'].includes(choice.action)){validateNpcWearableUse(state,job,g,choice);continue;}
   if(!record||record.version!==1||!['host-suppression','host-form','host-appearance'].includes(choice.action))throw Error('人物宿主决定缺少实际操作来源');
   const {hash:digest,...body}=record,hash=rules.abilities.hash,receipt=record.receipt,actorId=g.ownerId;
   const intent=choice.action==='host-suppression'?{actorId,type:'host.set-suppression',itemId:choice.itemId,percent:choice.percent}:choice.action==='host-appearance'?{actorId,type:'host.set-appearance',itemId:choice.itemId,preset:choice.preset}:{actorId,type:'host.set-form',itemId:choice.itemId,slot:choice.slot,formId:choice.formId??'',level:choice.level??0};
   if(digest!==hash(body)||choice.kind!==g.kind||hash(choice)!==hash(record.decision)||hash(record.intent)!==hash(intent)||job.status!=='decided'||job.decisionSourceId!==g.decisionSourceId||record.requestId!==job.id||record.decisionSourceId!==g.decisionSourceId||g.status!=='completed'||receipt?.id!==`npc-intimate:${g.decisionSourceId}`||receipt.actorId!==actorId||receipt.itemId!==choice.itemId||receipt.type!==intent.type||typeof receipt.completed!=='boolean')throw Error('人物宿主决定与实际结算不符');
   const item=record.frame?.物品?.实例?.[choice.itemId],wearerId=rules.host.carrier(record.frame,item)?.personId;
   const frame=rules.host.validateAttributeFrame(structuredClone(record.frame),wearerId,npcWorldMinute(g.createdAt)),quote=rules.host.actions(frame,item,actorId).find((q:any)=>q.action===intent.type);
   if(!quote?.available||npcWorldMinute(receipt.before)!==frame.at||npcWorldMinute(receipt.after)!==frame.at+receipt.minutes||receipt.minutes<0||receipt.minutes>quote.minutes||receipt.completed&&receipt.minutes!==quote.minutes)throw Error('人物宿主操作缺少原权限或实际耗时');
   const detail=choice.action==='host-suppression'?rules.host.setSuppression(frame,item.id,actorId,choice.percent):choice.action==='host-appearance'?rules.host.setAppearance(frame,item.id,actorId,choice.preset):rules.host.setForm(frame,item.id,actorId,choice.slot,choice.formId??'',choice.level??0);
   if(receipt.completed?hash(receipt.detail)!==hash(detail):receipt.detail!==null)throw Error('人物宿主操作结果与原请求不符');
   const original=state.世界.processedTransactions?.[receipt.id];if(original&&hash(original)!==hash(receipt))throw Error('人物宿主操作与原始回执不符');
  }
  if(g.kind==='permit-custody-duty'){
   const choice=validateNpcDecision(job.decision),event=rules.custody.table(state).events.find((e:any)=>e.type==='logistics-dutyPermissions'&&e.record?.sourceId===`npc-duty:${g.decisionSourceId}`&&e.previousHash===null),permission=event?.record;
   if(choice.kind!==g.kind||g.status!=='completed'||job.decisionSourceId!==g.decisionSourceId||!permission||event.actorId!==g.ownerId||permission.personId!==g.ownerId||permission.leaderId!==choice.targetId||permission.mode!==choice.mode||permission.issuedAt!==npcWorldMinute(g.createdAt))throw Error('人物职责许可缺少本人决定与实际授权记录');
  }
  if(g.kind==='tell-custody-news'){
   const choice=validateNpcDecision(job.decision),message=rules.social.table(state).messages.find((m:any)=>m.id===`message:npc-news:${g.decisionSourceId}`);
   if(choice.kind!==g.kind||g.status!=='completed'||job.decisionSourceId!==g.decisionSourceId||!message||message.senderId!==g.ownerId||message.recipientId!==choice.targetId||!['face-to-face','interior'].includes(message.channel)||message.status!=='delivered'||message.sentAt!==npcWorldMinute(g.createdAt)||JSON.stringify(message.factIds)!==JSON.stringify(choice.factIds))throw Error('人物转告缺少本人决定和真实送达记录');
  }
  if(['visit','supply-trip','expedition'].includes(g.kind)&&!(state.世界.npcPlans??[]).some((p:any)=>p.id===g.planId&&p.personal&&p.sourceId===g.id&&p.ownerId===g.ownerId))throw Error('人物目标缺少真实行程');
  if(g.kind==='leave-party'&&(g.status!=='completed'||!(state.人物.列表[g.ownerId].扩展?.社交约定??[]).some((r:any)=>r.id===g.membershipId&&r.kind==='party'&&r.status==='ended'&&r.events.some((e:any)=>e.status==='ended'&&e.endedBy===g.ownerId&&e.sourceId===g.decisionSourceId&&e.reason===g.motive))))throw Error('人物离队目标缺少本人结束约定的记录');
  if(g.kind==='supply-trip'&&!(state.世界.npcRequests??[]).some((r:any)=>r.id===g.requestIdRef&&r.goalId===g.id&&r.ownerId===g.ownerId))throw Error('人物补给目标缺少委托记录');
  if(g.invitationId&&!(state.人物.列表[g.ownerId].扩展?.社交约定??[]).some((r:any)=>r.id===g.invitationId&&r.goalId===g.id&&r.initiatorId===g.ownerId&&r.locationId===g.destinationId&&npcWorldMinute(r.startsAt)===npcWorldMinute(g.arriveAt)))throw Error('人物主动邀约与原计划不符');
 }
}

function validateNpcCollaborations(state:any){
 const now=npcWorldMinute(state.世界.时间),ids=new Set();
 if(state.世界.npcCollaborations!==undefined&&!Array.isArray(state.世界.npcCollaborations))throw Error('人物合作记录无效');
 for(const r of state.世界.npcCollaborations??[]){
  const goal=(state.世界.npcGoals??[]).find((g:any)=>g.id===r.goalId),owner=state.人物.列表[r.initiatorId],partner=state.人物.列表[r.personId];
  if(!goal||!owner||!partner||owner.id===partner.id||partner.id===state.角色.主控单位ID||goal.ownerId!==owner.id||r.locationId!==goal.destinationId||npcWorldMinute(r.startsAt)!==npcWorldMinute(goal.arriveAt)||r.endsAt!==npcWorldMinute(r.startsAt)+60||typeof r.id!=='string'||ids.has(r.id)||typeof r.branchId!=='string'||!Array.isArray(r.events)||!r.events.length)throw Error('人物合作来源无效');ids.add(r.id);
  let previous='',time=0;for(const event of r.events){
   const allowed=previous===''?['pending']:previous==='pending'?['accepted','rejected']:previous==='accepted'?['completed','missed','blocked']:[];
   if(!allowed.includes(event.status)||typeof event.sourceId!=='string'||!event.sourceId||!Number.isSafeInteger(npcWorldMinute(event.time))||npcWorldMinute(event.time)<time||npcWorldMinute(event.time)>now||!Array.isArray(event.knownBy)||new Set(event.knownBy).size!==event.knownBy.length||event.knownBy.some((id:string)=>!state.人物.列表[id]))throw Error('人物合作事件无效');
   if(event.status==='completed'&&![goal.planId,r.planId].every(id=>{const plan=(state.世界.npcPlans??[]).find((p:any)=>p.id===id);const last=plan?.events.filter((e:any)=>npcWorldMinute(e.time)<=npcWorldMinute(event.time)&&['departed','arrived','waiting'].includes(e.kind)).at(-1);return last&&last.kind!=='departed'&&last.locationId===r.locationId;}))throw Error('人物合作缺少实际到场来源');
   if(event.status==='completed'&&(event.locationId!==r.locationId||npcWorldMinute(event.time)<npcWorldMinute(r.startsAt)||npcWorldMinute(event.time)>r.endsAt||![r.initiatorId,r.personId].every(id=>event.knownBy.includes(id))))throw Error('人物合作会合证据无效');previous=event.status;time=npcWorldMinute(event.time);
  }
  if(r.status!==previous||(r.status==='accepted'? !Number.isSafeInteger(r.nextAt)||r.nextAt<now :r.nextAt!==null))throw Error('人物合作进度无效');
  if(r.events.some((e:any)=>e.status==='accepted')&&!(state.世界.npcPlans??[]).some((p:any)=>p.id===r.planId&&p.peer&&p.ownerId===r.personId&&p.sourceId===r.id&&p.branchId===r.branchId))throw Error('人物合作缺少行程');
 }
 for(const j of state.世界.npcDecisions??[]){
  if(j.kind==='seek-partner'&&!state.世界.npcGoals.some((g:any)=>g.id===j.goalId&&g.ownerId===j.ownerId&&g.partnerSearchId===j.id))throw Error('人物另作安排来源无效');
  if(j.kind==='partner-response'&&(!(state.世界.npcCollaborations??[]).some((r:any)=>r.id===j.collaborationId&&j.id===`${r.id}:response`&&r.goalId===j.goalId&&r.personId===j.ownerId)||!state.世界.npcDecisions.some((root:any)=>root.id===j.rootRequestId&&root.goalId===j.goalId)))throw Error('人物合作回应来源无效');
  if(j.kind&& !['seek-partner','partner-response','release-response'].includes(j.kind))throw Error('人物考虑类型无效');
 }
}
