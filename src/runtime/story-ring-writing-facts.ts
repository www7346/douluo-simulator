import {rules} from '../rules';
import type {StoryEventNames} from './story-event-names';
import type {StoryTurn,StoryStepResult} from './story-turns';
import {abilityWritingMeaning} from './ability-writing';
import {compileOwnedAbilities,compileOwnedRings} from './story-person-writing-facts';
const copy=<T>(v:T):T=>structuredClone(v);
const pick=(v:any,keys:string[])=>Object.fromEntries(keys.filter(k=>v&&Object.hasOwn(v,k)).map(k=>[k,copy(v[k])]));
function known(v:any,fields:string[],label:string){const unknown=Object.keys(v).filter(k=>!['type','id','transactionType','summary','meaning',...fields].includes(k));if(unknown.length)throw Error(`魂环结果缺少字段编译：${label}/${unknown.join(',')}`);}
function age(years:any){return Number.isSafeInteger(years)&&years>0?{years,color:rules.foundation.getAgeTier(years).颜色,ageTier:rules.foundation.getAgeTier(years).名称}:null;}
function gates(g:any){return g?Object.fromEntries(Object.entries(g).flatMap(([k,v]:[string,any])=>{if(!['承载','肉身','灵魂'].includes(k))throw Error(`吸收条件缺少编译：${k}`);known(v,['通过','压力','上限','威胁系数','冲突系数','机缘豁免','兼容别名'],k);return v.兼容别名?[]:[[k,{passed:v.通过,loadPressure:v.压力,currentCapacity:v.上限,opportunityExemption:v.机缘豁免??false}]];})):null;}
function compatibility(c:any){if(!c)return null;known(c,['score','ratio','axes','bridgeIds','conflicts','blessing','bridges','residualFallbackRequired','residualFallback','baseActionFallback'],'契合结果');
 return {score:c.score,conversionRatio:c.ratio,bridges:copy(c.bridges??c.bridgeIds??[]),conflicts:copy(c.conflicts??[]),sourceBlessing:c.blessing??false,requiresResidual:c.residualFallbackRequired??false,residualSelected:c.residualFallback??null,baseActionSelected:c.baseActionFallback??null};}
function budget(b:any){if(!b)return null;known(b,['potential','compatibility','qualityMultiplier','conversion','converted','guaranteedMinimum','usable','available','allocations','spent','unallocated','expressionCost','skillAvailable','totalSpent','residualFallback','baseActionFallback'],'魂技机械强度');
 return {kind:'魂技机械强度额度',potential:b.potential,available:b.available??b.usable,allocatedPerSkill:copy(b.allocations??null),used:b.spent??null,expressionGrowthCost:b.expressionCost??0,totalUsed:b.totalSpent??b.spent??null,unallocated:b.unallocated??null};}
export function compileRingChoices(c:any){
 known(c,['pendingId','martialSoulId','martialSoulName','beastName','years','ringOrdinal','absorbed','sourceKind','sourceNarrative','candidates'],'待选魂技');
 if(c.absorbed!==false)throw Error('待选魂技阶段与来源不一致');
 return {stage:'已经准备且尚未吸收的候选',...pick(c,['pendingId','martialSoulId','martialSoulName','beastName','ringOrdinal','sourceKind','sourceNarrative']),ring:age(c.years),
  candidates:c.candidates.map((r:any)=>{known(r,['candidateId','number','title','skills','skillNames'],'魂技候选');return {...pick(r,['candidateId','number','title','skillNames']),...(r.skills?{skills:compileOwnedAbilities(r.skills)}:{})};})};
}
function query(q:any){
 known(q,['pass','reasons','itemId','name','source','years','eligibility','compatibility','gates','pendingId','martialSoulId','lootId','condensed','beastUnitId','beastName','ageTier','martialSoulName','ordinal','pendingMartialSoulId','choiceCount'],'吸收预览');
 return {stage:'当前吸收条件的查询结果',allowed:q.pass,reasons:copy(q.reasons),...pick(q,['itemId','name','lootId','condensed','beastUnitId','beastName','martialSoulId','martialSoulName','ordinal','pendingId','pendingMartialSoulId','choiceCount']),ring:age(q.years),
  advancementEligibility:copy(q.eligibility??null),absorptionGates:gates(q.gates),compatibility:compatibility(q.compatibility),
  ...(q.source?{sourceIdentity:{profileId:q.source.id,name:q.source.名称,years:q.source.年限,attributes:copy(q.source.属性谱),traits:copy(q.source.类别标签),anatomy:copy(q.source.解剖标签),sourceKind:q.source.扩展?.kind??null,narrative:copy(q.source.扩展?.机缘叙事??null)}}:{})};
}
export const RING_RECEIPT_FIELDS:Record<string,string[]>={
 'ring-item-inspected':['quote'],'ring-choices-inspected':['choices'],'ring-source-inspected':['quote'],
 'ring-skill-choice-prepared':['pendingId','lootId','martialSoulId','beastProfileId','ringOrdinal','absorptionMode','years','choiceCount','distinctChoiceCount','choiceRule','mechanicsHash','budget','choices'],
 'ring-absorbed':['playerId','martialSoulId','ringId','ringOrdinal','absorptionMode','years','ageTier','gates','compatibility','budget','permanentGains','attributePointsGained','totalOwnedRingCount','totalRingAttributePoints','availableAttributePoints','skillIds','skillNames','effectIdsBySkill','releasedStoredExperience','derivedAfter','selection','sourceSettlement','ringIdentity','skillDefinitions'],
};
export function compileRingReceipt(turn:StoryTurn,r:StoryStepResult){
 const c=r.receipt!,fields=RING_RECEIPT_FIELDS[c.type];if(!fields)throw Error(`魂环回执缺少编译：${c.type}`);known(c,fields,c.type);
 if(c.quote)return {stage:'查询结果',queryResult:query(c.quote),ring:age(c.quote.years)};
 if(c.type==='ring-choices-inspected')return {stage:'查询结果',choices:compileRingChoices(c.choices),ring:age(c.choices.years)};
 if(c.type==='ring-skill-choice-prepared')return {stage:'已准备候选',...pick(c,['pendingId','lootId','martialSoulId','beastProfileId','ringOrdinal','absorptionMode','mechanicsHash']),ring:age(c.years??c.choices?.years),
  frozenChoiceCount:c.choiceCount??null,distinctChoiceCount:c.distinctChoiceCount??null,choiceCountRule:copy(c.choiceRule??null),mechanicalBudget:budget(c.budget),choices:c.choices?compileRingChoices(c.choices):null};
 if(c.selection)known(c.selection,['pendingId','candidateId','candidateIndex','choiceCount','mechanicsHash','fingerprint','unchosenCandidateIds'],'实际选择');
 if(c.sourceSettlement)known(c.sourceSettlement,['consumedItemIds','removedUnitIds','removedSkillIds'],'实际来源结清');
 const released=c.releasedStoredExperience;if(released)known(released,['levelsGained','attributePointsGained','titleUnlocked'],'瓶颈突破成长');
 const definitions=c.skillDefinitions?.map((s:any)=>({id:s.id,name:s.name,source:{kind:'soul',ringId:c.ringId,martialSoulId:c.martialSoulId},meaning:abilityWritingMeaning(s)}));
 const skills=definitions??(turn.after?.player?.abilities??[]).filter((s:any)=>(c.skillIds??[]).includes(s.id));
 return {stage:'已吸收',actorId:c.playerId,ring:c.ringIdentity?compileOwnedRings([c.ringIdentity])[0]:{...pick(c,['ringId','ringOrdinal','martialSoulId','absorptionMode']),...age(c.years)},absorptionMode:c.absorptionMode,
  gainedSkills:compileOwnedAbilities(skills),consumedItemIds:copy(c.sourceSettlement?.consumedItemIds??[]),removedSourceUnitIds:copy(c.sourceSettlement?.removedUnitIds??[]),removedSourceSkillIds:copy(c.sourceSettlement?.removedSkillIds??[]),selection:copy(c.selection??null),
  absorptionGates:gates(c.gates),compatibility:compatibility(c.compatibility),mechanicalBudget:budget(c.budget),permanentGains:copy(c.permanentGains),attributePointsGained:c.attributePointsGained,
  levelsGained:released?.levelsGained??0,additionalGrowth:released?{attributePointsGained:released.attributePointsGained,titleUnlocked:released.titleUnlocked}:null,
  resultTotals:{ownedRingCount:c.totalOwnedRingCount,ringAttributePointEntitlement:c.totalRingAttributePoints,availableAttributePoints:c.availableAttributePoints},derivedAfter:copy(c.derivedAfter)};
}
export function compileRingContext(r:any){return {
 sourceRemains:r.sources?.map((s:any)=>({...pick(s,['beastUnitId','name']),ring:age(s.years)}))??null,
 carriedSources:r.items?.map((i:any)=>{known(i,['itemId','name','years','ageTier','kind','attributes','bypassCapacity','divisionLevel','ringOrdinal','sourceNarrative','pendingId'],'随身魂环来源');return {...pick(i,['itemId','name','kind','attributes','sourceNarrative','pendingId']),ring:age(i.years),eligibility:{bypassCapacity:i.bypassCapacity,requiredDivisionLevel:i.divisionLevel??null,requiredOrdinal:i.ringOrdinal??null}};})??null,
 pending:r.pending?.map(compileRingChoices)??null,
};}

export function ringEventAccount(type:string,f:any,n:StoryEventNames):string{
 const actor=n.person(f.actorId??n.actorId),ring=f.ring;
 const identity=ring?`${ring.years}年${ring.color}魂环`:'所选魂环来源';
 if(f.queryResult){const q=f.queryResult;return `${actor}查看${q.name??q.beastName??identity}的吸收条件：${q.allowed?'当前条件通过':'当前条件未通过'}${q.reasons?.length?`，${q.reasons.join('；')}`:''}。本次为查询，尚未吸收。`;}
 if(type==='ring-choices-inspected'||type==='ring-skill-choice-prepared')return `${actor}${type==='ring-choices-inspected'?'查看已准备的':'已准备'}${identity}的魂技候选${f.choices?`，对应${f.choices.martialSoulName??n.soul(f.choices.martialSoulId)}：${f.choices.candidates.map((c:any)=>`${c.number}号${c.title}（${(c.skillNames??c.skills?.map((s:any)=>s.name)??[]).join('、')}）`).join('；')}`:''}。当前尚未吸收，等待选择。`;
 return [`${actor}已实际吸收${identity}，归于${n.soul(ring?.martialSoulId)}的第${ring?.ordinal??ring?.ringOrdinal}魂环。`,
  `实际获得魂技：${f.gainedSkills.map((s:any)=>s.name).join('、')||'无'}；本次魂环属性点${f.attributePointsGained}，释放积累经验后提升${f.levelsGained}级${f.additionalGrowth?`、额外获得属性点${f.additionalGrowth.attributePointsGained}`:''}。`,
  ...(f.consumedItemIds.length?[`已消耗来源实物：${f.consumedItemIds.map(n.item).join('、')}。`]:[]),
  `吸收后共有${f.resultTotals.ownedRingCount}枚魂环，可用属性点${f.resultTotals.availableAttributePoints}。`].join('\n');
}
