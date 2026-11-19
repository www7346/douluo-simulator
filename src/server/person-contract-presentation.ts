import {rules} from '../rules';
import {personContractFacts,knowsCurrentContractVersion,contractPenaltyLabel,contractDuration} from '../runtime/person-contract';
import {skillName} from '../runtime/player-text';

const fields=['contractId','personId','skillId','branchId','nodeId','contractKind','template','durationValue','durationUnit','penaltyValue','penaltyUnit','penaltyParams','amount','unitPrice','pieces'];
const units:Record<string,number>={minute:1,day:1440,year:518400};
const text=(v:any)=>typeof v==='string'&&v.length>0&&v.length<=240;
const period=(value:any,unit:any,max:number,fallback:number)=>{if(value===undefined||value==='')return fallback;const n=Number(value)*units[unit??'day'];if(!Number.isSafeInteger(n)||n<1||n>max)throw Error('所选期限超过实际来源上限');return n;};
const costLabel=(c:any)=>c.kind==='soulPower'?`魂力 ${c.amount}`:c.kind==='health'?`生命 ${c.amount}`:c.kind==='lifespan'?`寿命 ${c.amount} 分钟`:`材料 × ${c.quantity}`;
/** The same bounded actual source choices serve the form and the host catalog. */
export function personContractSourceOptions(state:any,actorId=state.角色.主控单位ID,originalSource?:any){
 const sourceActorId=originalSource?.actorId??actorId,skills=(state.战斗单位?.列表?.[sourceActorId]?.能力?.技能ID??[]).map((id:string)=>state.技能.列表[id]).filter((skill:any)=>skill&&rules.abilities.verify(skill).pass&&(!originalSource||sourceActorId===actorId||skill.id===originalSource.skillId));
 return skills.flatMap((skill:any)=>rules.effects.contractGraphProfile(skill).branches.filter((branch:any)=>!originalSource||sourceActorId===actorId||branch.branchId===originalSource.branchId).map((branch:any)=>({id:`${skill.id}:${branch.branchId}`,skillId:skill.id,branchId:branch.branchId,name:skillName(skill,state),durationMinutes:branch.durationMinutes,perPersonUses:branch.perPersonUses,penalties:branch.penalties.filter((p:any)=>!originalSource||sourceActorId===actorId||p.nodeId===originalSource.selection.nodeId).map((p:any)=>({nodeId:p.nodeId,effectId:p.effectId,name:contractPenaltyLabel({...p,params:p.defaultParams}),defaultParams:p.defaultParams,effectiveCap:p.effectiveCap,...(p.components?{components:p.components}:{})})),costs:rules.combat.fieldCostContract(state.战斗单位.列表[sourceActorId],skill).costs.map(costLabel),sourceItem:skill.sourceItemId&&['consumable','hidden-weapon'].includes(skill.sourceKind)?state.物品.实例[skill.sourceItemId]?.name:null}))) as any[];
}
/** A bounded form projection: every template and punishment comes from actual originals. */
export function personContractPresentation(state:any,input:Record<string,any>={}){
 if(Object.keys(input).some(k=>!fields.includes(k))||Object.entries(input).some(([k,v])=>!['durationValue','penaltyValue','penaltyParams','amount','unitPrice','pieces'].includes(k)&&!text(v)))throw Error('契约选择参数无效');
 if(input.penaltyParams!==undefined&&(!input.penaltyParams||typeof input.penaltyParams!=='object'||Array.isArray(input.penaltyParams)))throw Error('处罚程度格式不完整');
 const actorId=state.角色.主控单位ID,counter=input.contractId?rules.personContracts.get(state,input.contractId):null;if(input.contractId&&(!counter||counter.forcedSourceStatusId||!counter.parties.includes(actorId)||!['proposed','sourceUnavailable','accepted'].includes(counter.status)))throw Error('当前没有本人可反提的契约');if(counter){const known=personContractFacts(state,actorId).find((r:any)=>r.id===counter.id);if(!known?.canRespond||!knowsCurrentContractVersion(known))throw Error('本人目前不能对未知或已同意的版本反提');}const originalSource=counter?.versions.at(-1).source,personId=input.personId??counter?.parties.find((id:string)=>id!==actorId),person=personId?state.人物?.列表?.[personId]:null;
 if(personId&&(!person||personId===actorId))throw Error('请选择另一名真实人物');
 const targets=(Object.values(state.人物?.列表??{}) as any[]).filter(p=>p.id!==actorId&&p.status!=='dead'&&rules.actions.communicationColocated(state,actorId,p.id)).map(p=>({id:p.id,name:p.name}));
 const records=personContractFacts(state,actorId).filter((r:any)=>!personId||r.parties.includes(personId)).map((r:any)=>{
  const original=rules.personContracts.get(state,r.id),preview=(type:string)=>rules.world.previewIntent(state,{type,actorId,contractId:r.id,versionHash:r.versionHash});
  const end=original.status==='active'&&!original.forcedSourceStatusId?preview('end-person-contract'):null;
  return {...r,canRespond:r.canRespond&&original.acceptances[actorId]!==r.versionHash&&knowsCurrentContractVersion(r),canRetry:original.status==='sourceUnavailable'&&preview('retry-person-contract').available===true,canEnd:end?.available===true,endReason:end?.reason??'',endConsequence:original.kind==='soul'?`${r.penaltyLabel}${r.penaltyDuration?`，持续${r.penaltyDuration}`:''}；以本人剩余处罚次数为准`:'普通契约不自动处罚'};
 });
 const sourceActorId=originalSource?.actorId??actorId,sources=personContractSourceOptions(state,actorId,originalSource);
 const requestedSkill=input.skillId??originalSource?.skillId,requestedBranch=input.branchId??originalSource?.branchId;const source=requestedSkill?sources.find(s=>s.skillId===requestedSkill&&(!requestedBranch||s.branchId===requestedBranch)):sources[0];
 if(input.skillId&&!source)throw Error('请选择本人实际持有的誓约来源');
 const kind=counter?.kind??input.contractKind??(input.skillId?'soul':'ordinary');if(!['ordinary','soul'].includes(kind))throw Error('只有普通契约与灵魂契约');
 const penalties=source?.penalties??[],requestedNode=input.nodeId??originalSource?.selection.nodeId,penalty=kind==='soul'?(requestedNode?penalties.find((p:any)=>p.nodeId===requestedNode):penalties.find((p:any)=>!(p.components??[p]).some((c:any)=>c.effectId==='payload.death'))):null;
 if(kind==='soul'&&input.nodeId&&!penalty)throw Error('请选择来源实际支持的惩罚');
 const templates:any[]=[...(counter?[{id:'current-terms',name:'保留当前完整条款'}]:[]),{id:'mutual-no-attack',name:'双方不主动攻击'},{id:'other-no-attack',name:'对方不主动攻击我'},{id:'self-no-attack',name:'我不主动攻击对方'},...rules.personContracts.DOMAINS.map((domain:string)=>({id:'obey-'+domain,name:`对方接受${domain}要求`,domain})),{id:'master-other',name:'对方成为我的仆从'},{id:'master-self',name:'我成为对方的仆从'}];
 if(person){for(const g of rules.gifts.records(state).filter((g:any)=>g.playerId===actorId&&g.personId===personId||g.playerId===personId&&g.personId===actorId))templates.push({id:'delivery:'+g.id,name:`原赠物约定：${g.itemName??'物品'}`,kind:'delivery',original:g});for(const a of rules.performanceAgreements.table(state).records??[])if([a.authorityId,a.subjectId].includes(actorId)&&[a.authorityId,a.subjectId].includes(personId))templates.push({id:'performance:'+a.id,name:'履行已有服务约定',kind:'performance',original:a});
  for(const shop of Object.values(state.商店?.列表??{}) as any[])if(shop.merchantId===personId&&shop.status==='open')for(const itemId of state.容器.列表[shop.stockContainerId]?.itemIds??[]){const item=state.物品.实例[itemId];if(item)templates.push({id:'shop:'+shop.id+':'+itemId,name:`协议购买：${item.name}`,kind:'shop-price',shopId:shop.id,itemId,merchantId:personId});}
 }
 const template=templates.find(t=>t.id===input.template)??templates[0],clauses:any[]=[];
 if(input.template&&!templates.some(t=>t.id===input.template))throw Error('请选择当前真实可用的契约条款');
 if(person){const clause=(obligorId:string,beneficiaryId:string,kind:string,extra:any={})=>({kind,obligorId,beneficiaryId,...extra});
  if(template.id==='current-terms')clauses.push(...structuredClone(counter.versions.at(-1).terms.clauses));
  else if(template.id==='mutual-no-attack')clauses.push(clause(actorId,personId,'no-attack'),clause(personId,actorId,'no-attack'));
  else if(template.id==='self-no-attack')clauses.push(clause(actorId,personId,'no-attack'));
  else if(template.id==='other-no-attack')clauses.push(clause(personId,actorId,'no-attack'));
  else if(template.domain)clauses.push(clause(personId,actorId,'obey-domain',{domain:template.domain}));
  else if(template.id.startsWith('master-'))clauses.push(clause(template.id==='master-self'?actorId:personId,template.id==='master-self'?personId:actorId,'master-slave'));
  else if(template.kind==='delivery')clauses.push(clause(template.original.playerId,template.original.personId,'delivery',{evidenceKind:'controlled-gift',evidenceId:template.original.id}));
  else if(template.kind==='performance')clauses.push(clause(template.original.subjectId,template.original.authorityId,'performance',{agreementId:template.original.id}));
  else if(template.kind==='shop-price')clauses.push(clause(personId,actorId,'shop-price',{shopId:template.shopId,merchantId:personId,itemId:template.itemId,direction:'buy',unitPrice:Number(input.unitPrice??rules.world.quotePrice(state,template.shopId,template.itemId,'buy',1).unitPrice),pieces:Number(input.pieces??1)}));
 }
 const maximumDurationMinutes=kind==='soul'?source?.durationMinutes??1440:5184000,durationMinutes=period(input.durationValue,input.durationUnit,maximumDurationMinutes,counter?.versions.at(-1).terms.durationMinutes??(kind==='soul'?maximumDurationMinutes:1440));
 const params=penalty?structuredClone(input.penaltyParams??(originalSource?.selection.nodeId===penalty.nodeId?originalSource.selection.params:penalty.defaultParams)):null;if(params?.持续分钟!==undefined)params.持续分钟=period(input.penaltyValue,input.penaltyUnit,penalty.effectiveCap.持续分钟,params.持续分钟);
 if(params?.数值!==undefined&&input.amount!==undefined&&input.amount!==''){const amount=Number(input.amount),cap=Math.abs(penalty.effectiveCap.数值);if(!Number.isSafeInteger(amount)||amount<1||amount>cap)throw Error('处罚程度超过实际来源上限');params.数值=penalty.effectId==='status.buff'?-amount:amount;}
 const draft:any={type:counter?'respond-person-contract':'propose-person-contract',...(counter?{contractId:counter.id,versionHash:counter.versions.at(-1).hash,decision:'counter'}:{targetId:personId,contractKind:kind}),terms:{durationMinutes,clauses},...(kind==='soul'&&source&&penalty?{source:{actorId:sourceActorId,skillId:source.skillId,branchId:source.branchId,selection:{nodeId:penalty.nodeId,params}}}:{})};
 const preview=person?rules.world.previewIntent(state,{...draft,actorId}):{available:false,reason:'请选择另一名当事人'};
 return {actorId,personId,counter:!!counter,targets,records,templates:templates.map(({original,...t})=>t),sources,selected:{contractKind:kind,template:template.id,source:source??null,penalty:penalty?{...penalty,params,label:contractPenaltyLabel({...penalty,params})}:null,durationMinutes,durationLabel:contractDuration(durationMinutes),maximumDurationMinutes,...(template.kind==='shop-price'?{unitPrice:clauses[0]?.unitPrice,pieces:clauses[0]?.pieces}:{})},draft,available:preview.available===true,reason:preview.reason??''};
}
