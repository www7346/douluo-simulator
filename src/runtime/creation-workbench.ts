import {creationReason,replaceWorkspaceSoul,customSoulDraft,type CreationWorkspace} from '../shared/creation-draft';
export {creationReason,replaceWorkspaceSoul,rememberManualSoul,rememberSoulAdvice,type CreationWorkspace} from '../shared/creation-draft';
import {rules} from '../rules';
import {playerText} from './player-text';
import {validateCreationDiscussion} from '../shared/creation-discussion';
import {validateItemDiscussion} from '../shared/creation-item-discussion';
const clone=<T,>(value:T):T=>structuredClone(value);
const FIELD_NAMES:Record<string,string>={name:'名称',concept:'核心概念',form:'显化形态',role:'战斗定位',categories:'武魂类别',attributes:'属性',channels:'能力方向',traits:'先天特性',weaknesses:'限制',baseAction:'基础动作'};
export function soulTemplateDraft(templateId:string):Record<string,any> {
  const template=rules.world.MARTIAL_SOUL_TEMPLATES[templateId];
  if(!template)throw new Error('这份武魂范本已经不可用');
  const source=clone(template.结构化武魂?.definition ?? template.结构化武魂);
  return {...source,name:template.名称,playerConfirmed:false};
}
/** Current creation format only; never convert or silently discard a player's selections. */
export function validateCreationWorkspace(input:Record<string,any>):Record<string,any> {
  const result=clone(input),config=result.config;
  if(result.version!==5)throw Error('旧角色草稿仅可查看与导出，请重新创建角色方案');
  if(result.characterDiscussion!==undefined)validateCreationDiscussion(result.characterDiscussion);
  if(result.itemDiscussion!==undefined)validateItemDiscussion(result.itemDiscussion);
  if(result.creationFlow!==undefined&&!['quick','detailed'].includes(result.creationFlow))throw Error('请选择快速开始或详细定制');
  if(!config||config.mode!=='awakening'||Object.hasOwn(config,'level'))throw new Error('这份觉醒构想格式不受支持，请使用新版角色方案');
  if(!config.background)throw new Error('旧角色草稿仅可查看与导出，请选择新版背景');
  rules.backgrounds.selection(config.background);
  if(config.difficulty!==undefined&&!['normal','unlimited'].includes(config.difficulty))throw Error('请选择正常点数或无限点数');
  if(config.openingWorkshop!==undefined)config.openingWorkshop=rules.openingWorkshop.normalize(config.openingWorkshop);
  const opening=rules.talents.inspectSelection(config.opening,{purchase:false});
  if(!opening.pass)throw new Error(opening.errors.join('；'));
  const check=(soul:any)=>{if(!soul||soul.attributeVersion!==rules.martialSoul.ATTRIBUTE_VERSION)throw new Error('这份武魂属性格式不受支持，请使用新版武魂方案');};
  if(!Array.isArray(config.martialSoulDrafts))throw new Error('武魂构想不完整');
  config.martialSoulDrafts.forEach(check);
  result.reserveSouls?.forEach(check);
  for(const advice of Object.values(result.advisors??{}) as any[]){if(advice?.proposal)check(advice.proposal);if(advice?.session?.draft)check(advice.session.draft);}
  return result;
}
export function createWorkspace(config:Record<string,any>,saved?:Record<string,any>|null):CreationWorkspace {
  const source=validateCreationWorkspace(saved ?? {version:5,config,step:1});
  const draft=rules.backgrounds.capture(source.config);
  if(source.version!==5)throw new Error('这份觉醒构想格式不受支持');
  return {version:5,actorEditors:clone(source.actorEditors??{}),backgroundDrafts:clone(source.backgroundDrafts??{}),creationFlow:source.creationFlow??(saved?'detailed':'quick'),...(source.itemDiscussion?{itemDiscussion:clone(source.itemDiscussion)}:{}),...(source.characterDiscussion?{characterDiscussion:clone(source.characterDiscussion)}:{}),sourcePreferences:{'boon-ring':'asura','boon-bone':'asura',divine:'asura',million:'deep-sea-whale',...clone(source.sourcePreferences??{}),...Object.fromEntries(draft.opening.opportunities.filter((item:any)=>item.sourceId).map((item:any)=>[item.kind,item.sourceId]))},step:[1,2,3,4].includes(source.step)?source.step:1,config:draft,activeSoul:Math.max(0,Math.min(Number(source.activeSoul ?? 0),Math.max(0,(draft.martialSoulDrafts?.length ?? 1)-1))),reserveSouls:clone(source.reserveSouls??draft.martialSoulDrafts),advisors:clone(source.advisors??{}),requests:clone(source.requests ?? {})};
}
export function importWorkspace(config:Record<string,any>):CreationWorkspace {
  // Import current selections without rewriting their choices.
  return {...createWorkspace(config),step:4,requests:{},advisors:{}};
}
export function setSoulCount(workspace:CreationWorkspace,count:number):CreationWorkspace {
  const policy=rules.backgrounds.policy(workspace.config.background,workspace.config.difficulty);if(policy.readonly)throw Error('雪崩皇子完整档案只读');if(count>policy.maxSouls)throw Error('此背景只允许单一武魂');
  if(!Number.isInteger(count)||count<rules.world.CREATION_RULES.martialSoulMinimum||count>rules.world.CREATION_RULES.martialSoulMaximum)throw new Error('请选择一至三个武魂');
  const reserve=clone(workspace.reserveSouls);
  for(const [index,soul] of (workspace.config.martialSoulDrafts ?? []).entries())reserve[index]=clone(soul);
  const souls=Array.from({length:count},(_,index)=>clone(reserve[index] ?? rules.martialSoul.normalizeDraft({draftId:`creation-${index+1}`})));
  return {...workspace,reserveSouls:reserve,activeSoul:Math.min(workspace.activeSoul,count-1),config:{...workspace.config,background:{...workspace.config.background,ringChoices:[]},martialSoulCount:count,martialSoulDrafts:souls}};
}
export function creationPreview(config:Record<string,any>) {
  const effective={...config,situations:[]};
  const validation=rules.world.validateCreationDraft(effective);
  if(config.situations?.length){validation.errors.push('开局处境暂时停用，请移除原处境选择后继续');validation.pass=false;}
  const names=(config.situations??[]).map((v:any)=>v.contactName??rules.talents.SITUATIONS[v.id]?.contact);
  const canonical=(Object.values(rules.arena.CHARACTER_CATALOG) as any[]).flatMap(v=>[v.name,v.name.split('·')[0]]);
  if(names.some((name:string)=>canonical.includes(name))){validation.errors.push('处境联系人与已有原著人物重名，请使用新人物姓名');validation.pass=false;}
  const ledger=rules.world.creationPointLedger(effective);
  const souls=(config.martialSoulDrafts ?? []).map((soul:any,index:number)=>{
    const available=Math.max(0,ledger.soulBudget-(ledger.costs.martialSouls-(ledger.soulCosts[index] ?? 0)))+(ledger.preservedSoulCosts?.[index]??0);
    const inspection=rules.martialSoul.inspectDraft(soul,{budget:rules.backgrounds.policy(config.background,config.difficulty).readonly?100:available});
    const problems=[...inspection.missing,...inspection.ambiguities,...inspection.conflicts].map((item:any)=>creationReason(item.reason));
    for(const item of inspection.unsupported)problems.push(`${FIELD_NAMES[String(item.field).split('.')[0]] ?? '武魂设定'}含有无法识别的选择，请重新选择`);
    if(inspection.overBudget)problems.push(`这份方案还需减少${inspection.overBudget}点造化点消耗`);
    return {available,inspection,problems};
  });
  return {pass:validation.pass,errors:validation.errors.map(creationReason),ledger,souls};
}
export function editWorkspaceSoul(workspace:CreationWorkspace,index:number,operation:Record<string,any>):CreationWorkspace {
  if(rules.backgrounds.policy(workspace.config.background,workspace.config.difficulty).readonly)throw Error('雪崩皇子完整档案只读');
  const budget=creationPreview(workspace.config).souls[index]?.available ?? 0;
  const inspected=rules.martialSoul.applyManualEdit(customSoulDraft(workspace.config.martialSoulDrafts[index]),operation,{budget});
  return replaceWorkspaceSoul(workspace,index,inspected.draft);
}
export function replaceSoulEntry(workspace:CreationWorkspace,index:number,group:'attributes'|'baseAction',entryIndex:number,value:any) {
  if(rules.backgrounds.policy(workspace.config.background,workspace.config.difficulty).readonly)throw Error('雪崩皇子完整档案只读');
  if(group==='baseAction' && (!value.mode || !value.attributeId)) {
    // An unfinished form is a saved draft, never a committed combat ability.
    const soul=rules.martialSoul.normalizeDraft({...workspace.config.martialSoulDrafts[index],baseAction:value,playerConfirmed:false});
    return replaceWorkspaceSoul(workspace,index,soul);
  }
  const removed=editWorkspaceSoul(workspace,index,{action:'remove',group,index:entryIndex});
  const added=editWorkspaceSoul(removed,index,{action:'add',group,value});
  if(group==='attributes') {
    const soul=clone(added.config.martialSoulDrafts[index]);
    const entry=soul.attributes.pop();soul.attributes.splice(entryIndex,0,entry);
    return replaceWorkspaceSoul(added,index,soul);
  }
  return added;
}
