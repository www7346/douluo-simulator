import {compileActionState,perceivedActionState} from './story-state-writing-facts';
import {storyEventTime,type StoryEventNames} from './story-event-names';
const copy=<T>(v:T):T=>structuredClone(v);
const pick=(v:any,keys:string[])=>Object.fromEntries(keys.filter(k=>v&&Object.hasOwn(v,k)).map(k=>[k,copy(v[k])]));
function known(v:any,fields:string[],label:string){const unknown=Object.keys(v).filter(k=>!['type','id','summary','meaning',...fields].includes(k));if(unknown.length)throw Error(`人物档案缺少字段编译：${label}/${unknown.join(',')}`);}
export function compileOwnedAbilities(rows:any[]){return rows.map(a=>({...pick(a,['id','name','source','useRestriction']),meaning:a.meaning?.summary??null,usage:copy(a.meaning?.usage??null)}));}
export function compileOwnedSouls(rows:any[]){return rows.map(s=>({...pick(s,['id','name','form','active']),meaning:copy(s.meaning)}));}
export function compileOwnedRings(rows:any[]){return rows.map(r=>{
 known(r,['ownerId','martialSoulId','ordinal','years','color','ageTier','sourceProfileId','sourceName','attributes','sourceKind','skillIds','acquisition'],'已登记魂环身份');
 if(r.acquisition){const a=r.acquisition;known(a,['kind','label','note','historicalOnly','capacityExempt'],'开局魂环取得经历');if(!['hunt','divine','sacrifice','self-condensed','beast-transformation'].includes(a.kind)||typeof a.label!=='string'||typeof a.note!=='string'||a.historicalOnly!==true||a.capacityExempt!==(a.kind!=='hunt'))throw Error('开局魂环取得经历缺少对应规则证明');}
 return copy(r);
});}
export function compileOwnedItems(rows:any[]){return rows.map(i=>{
 known(i,['name','templateId','quantity','carried','integrated','storage','soulDeviceSlot','itemPosition','store','retrieve'],'已有物品');
 return {...pick(i,['id','name','type','templateId','quantity','carried','integrated','soulDeviceSlot','itemPosition','store','retrieve']),possession:i.integrated?'已融合':i.carried?'随身携带':i.storage?.kind==='custody-facility-stock'?`存于${i.storage.facilityName}设施给养仓库${i.quantity===null?'，当前数量未获知':''}`:i.storage?`存于${i.storage.positionLabel??'本人地点暂存'}`:'本人持有，未随身携带',storage:copy(i.storage??null)};
});}
export function compileMechanicalRegistration(m:any){
 if(!m)return null;known(m,['status'],'人物规则资料登记');
 if(!['pending','resolved'].includes(m.status))throw Error('人物规则资料登记阶段缺少编译');
 return {stage:m.status==='pending'?'身份已登记，能力与初始财产仍待规则需要时生成':'原人物的待定规则资料已完成实例化'};
}
export function compileEraBasis(e:any){return e?{basis:'创建时的配置来源',...pick(e,['epoch','sourceEntryIds','levelBasis','mechanicalInference'])}:null;}
export function compileDossier(d:any){
 known(d,['personId','name','identity','occupation','age','gender','appearance','personality','level','rank','locationId','time','revision','mechanics','resources','items','eraBasis','martialSouls','ownedRings','abilities','actionState'],'相遇资料');
 return {...pick(d,['personId','name','identity','occupation','age','gender','appearance','personality','level','resources']),
  observedAt:{time:copy(d.time),revision:d.revision,locationId:d.locationId},rank:d.rank?pick(d.rank,['name','allowedTitles']):null,
  registration:compileMechanicalRegistration(d.mechanics),creationBasis:compileEraBasis(d.eraBasis),...(d.ownedRings?{ownedRings:compileOwnedRings(d.ownedRings)}:{}),
  ...(d.actionState?{actionState:compileActionState(perceivedActionState(d.actionState))}:{}),...(d.items?{items:compileOwnedItems(d.items)}:{}),...(d.martialSouls?{martialSouls:compileOwnedSouls(d.martialSouls)}:{}),...(d.abilities?{abilities:compileOwnedAbilities(d.abilities)}:{})};
}
export function compileDossierReceipt(c:any){
 known(c,['personId','scope','dossier','resourceComparison','queryMeaning'],'读取人物档案');
 if(!['current-scene','last-encounter','voice-conversation','known-acquaintance'].includes(c.scope))throw Error('档案时间范围缺少编译');
 if(['voice-conversation','known-acquaintance'].includes(c.scope)&&(c.resourceComparison!==undefined||c.dossier?.personId!==c.personId||c.dossier?.locationId!==null||Object.keys(c.dossier??{}).some(k=>!['personId','name','time','revision','locationId'].includes(k))))throw Error('仅知称呼的档案不能含有未观察的资料');
 if(c.scope==='known-acquaintance'&&(c.dossier.time!==null||c.dossier.revision!==null))throw Error('熟人称呼没有现场观察时点');
 const d=c.resourceComparison;if(d)known(d,['baseline','current','resources'],'两次档案比较');
 return {stage:'已读取人物档案',personId:c.personId,scope:c.scope==='current-scene'?'当前场景登记资料':c.scope==='voice-conversation'?'当前可交谈人物的称呼':c.scope==='known-acquaintance'?'已经相识的人物称呼，未取得现场档案':'上次实际相遇的旧档案',dossier:compileDossier(c.dossier),
  ...(d?{observationComparison:{baseline:copy(d.baseline),current:copy(d.current),resources:d.resources.map((r:any)=>{known(r,['name','before','after','netChange','reading'],'资源两时点比较');return {resource:r.name,previousObservation:r.before,currentObservation:r.after,netChangeBetweenObservations:r.netChange};})}}:{})};
}

export function dossierEventAccount(f:any,n:StoryEventNames):string{
 const d=f.dossier,lines=[`已查看${d.name??n.person(f.personId)}的${f.scope}，记录时点${storyEventTime(d.observedAt.time)}、记录地点${n.location(d.observedAt.locationId)}。`];
 if(d.level!==undefined)lines.push(`该记录的等级为${d.level}${d.rank?`，称号${d.rank.name}`:''}。`);
 if(d.martialSouls?.length)lines.push(`武魂：${d.martialSouls.map((s:any)=>s.name).join('、')}。`);
 if(d.ownedRings?.length)lines.push(`魂环：${d.ownedRings.map((r:any)=>`${n.soul(r.martialSoulId)}第${r.ordinal}环、${r.years}年${r.color}`).join('；')}。`);
 if(d.resources)for(const [name,value] of Object.entries(d.resources) as [string,any][])lines.push(`${name}：${value.当前}/${value.最大}${value.锁定?`，占用${value.锁定}`:''}。`);
 if(d.items?.length)lines.push(`物品：${d.items.map((i:any)=>`${i.name}${i.quantity===null?'（数量未获知）':`×${i.quantity}`}，${i.soulDeviceSlot?`装备于${i.soulDeviceSlot}`:i.possession}`).join('；')}。`);
 const conditions=new Map((d.actionState?.abilityConditions?.actions??[]).map((a:any)=>[a.id,a]));
 if(d.abilities?.length)lines.push(`能力：${d.abilities.map((a:any)=>{const c:any=conditions.get(a.id);return `${a.name}${c?`（${c.selfConditionsMet?'可用':`暂不可用：${c.conditionReason??'当前行动受限'}`}${Number.isFinite(c.soulPowerCost)?`，耗魂${c.soulPowerCost}`:''}${c.cooldownRemaining?`，冷却剩余${c.cooldownRemaining}`:''}）`:''}${a.meaning?`：${a.meaning}`:''}`;}).join('；')}。`);
 const a=d.actionState;
 if(a)lines.push(`当前状态：${a.activeStatuses?.length?a.activeStatuses.map((s:any)=>`${s.name}${s.layers?`（${s.layers}层）`:''}${Number.isFinite(s.duration?.remainingMinutes)?`，剩余${s.duration.remainingMinutes}分钟`:''}`).join('；'):'无异常状态'}。`);
 if(a){if(a.silenceSources?.length)lines.push('当前发声受限。');if(a.voluntaryBattleMovementBlockedBy)lines.push(`移动限制：${a.voluntaryBattleMovementBlockedBy}。`);if(a.power?.statement)lines.push(a.power.statement);
  if(a.restrictions?.blocked)for(const [kind,reasons] of Object.entries(a.restrictions.blocked) as [string,any][])if(Array.isArray(reasons)&&reasons.length){const label:Record<string,string>={vision:'视觉',hearing:'听觉',voice:'发声',gesture:'手部动作',movement:'移动',contact:'接触',focus:'专注','soul-power':'运转魂力','martial-soul':'使用武魂',ingest:'吞服'};lines.push(`${label[kind]??'行动'}受限：${reasons.map(r=>typeof r==='string'?r:r.reason??r.name??'当前状态限制').join('；')}。`);}}
 return lines.join('\n');
}
