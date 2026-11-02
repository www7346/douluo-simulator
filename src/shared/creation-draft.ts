import {playerText} from '../runtime/player-text';
import {martialSoulArtwork} from '../runtime/generated-art';
import type {CreationDiscussion} from './creation-discussion';
import type {CreationItemDiscussion} from './creation-item-discussion';
const clone=<T,>(value:T):T=>structuredClone(value);


export interface CreationWorkspace {
  version:5;
  step:number;
  config:Record<string,any>;
  activeSoul:number;
  reserveSouls:Record<string,any>[];
  advisors:Record<string,any>;
  requests:Record<string,string>;
  sourcePreferences:Record<string,string>;
  characterDiscussion?:CreationDiscussion;
  itemDiscussion?:CreationItemDiscussion;
  creationFlow?:'quick'|'detailed';
  actorEditors?:Record<string,any>;
  backgroundDrafts?:Record<string,any>;
}

export function creationReason(value:unknown):string {
  const source=String(value ?? '');
  if(/LLM武魂提案|AI武魂顾问|AI追问必须|AI提案模式/.test(source))return '顾问这次的答复不完整，请继续讨论或重新构思';
  const prose=source.replace(/尚未通过代码审查|尚未通过代码终审|代码终审/g,'武魂设定尚需完善')
    .replace(/缺少一句可判定边界的核心概念/g,'请描述武魂怎样发挥力量')
    .replace(/至少选择一个类别锚点/g,'请选择至少一种武魂类别')
    .replace(/至少选择一个可执行表达机制/g,'请选择至少一种能力方向')
    .replace(/“植物”是隐藏父类，请改选具体植物子类或“其他植物”/g,'请选择具体植物类别，例如草本、藤蔓或其他植物')
    .replace(/亡灵生物武魂必须登记死亡属性；“亡灵”不是额外的第19种属性/g,'亡灵武魂还需要死亡属性')
    .replace(/机制专修/g,'能力专修').replace(/可执行表达机制|表达机制/g,'能力方向')
    .replace(/同一专长与参数不能重复购买/g,'相同特性与作用对象只能选择一次')
    .replace(/同一负面与参数不能重复返还点数/g,'相同限制只能选择一次')
    .replace(/登记参数/g,'作用对象').replace(/注册池/g,'可选能力').replace(/登记/g,'选择')
    .replace(/武魂负面/g,'武魂限制').replace(/基础动作/g,'本能动作').replace(/设定解析/g,'武魂设定')
    .replace(/已经购买的/g,'已选择的').replace(/代码不会替你自动删改。?/g,'可以继续调整。')
    .replace(/这(?:是)?一份待[^。；]*(?:草案|建议|方案)。?/g,'')
    .replace(/这份草案(?:还需|尚待|仍待)[^。；]*(?:确认|检查)。?/g,'是否采用，由你决定。')
    .replace(/先以这份草案送交检查/g,'可以先采用这份构想，再继续调整')
    .replace(/按现有消耗估计仍在\d+点额度内，具体消耗需重新核算，方案尚待检查和确认。?/g,'其他设定保持不变，是否采用由你决定。');
  return playerText(prose,{},'请检查这项设定后重试');
}

export function replaceWorkspaceSoul(workspace:CreationWorkspace,index:number,soul:Record<string,any>):CreationWorkspace {
  const souls=clone(workspace.config.martialSoulDrafts ?? []);
  if(!souls[index])throw new Error('请先选择需要编辑的武魂');
  souls[index]=clone(soul);
  const reserve=clone(workspace.reserveSouls);reserve[index]=clone(soul);
  return {...workspace,config:{...workspace.config,martialSoulDrafts:souls,...(workspace.config.background?{background:{...workspace.config.background,ringChoices:[]}}:{})},reserveSouls:reserve};
}

/** Commit a reviewed opening design and keep editor reserves on the same souls.
 * Otherwise changing soul count or reopening an actor editor can restore an old
 * cached draft and lose an adopted capability. */
export function applyOpeningRingConfig(workspace:CreationWorkspace,config:Record<string,any>):CreationWorkspace {
 const reserve=(current:any[],saved:any[]=[])=>[...clone(current),...clone(saved.slice(current.length))];
 const actorEditors=clone(workspace.actorEditors??{});
 for(const [key,editor] of Object.entries(actorEditors) as [string,any][]){
  const side=key.split(':')[0],souls=config.background?.actors?.[side]?.config?.martialSoulDrafts;
  if(souls)editor.reserveSouls=reserve(souls,editor.reserveSouls);
 }
 return {...workspace,config:clone(config),reserveSouls:reserve(config.martialSoulDrafts,workspace.reserveSouls),actorEditors};
}

/** Editing changes the mechanical preset identity while retaining its chosen illustration. */
export function customSoulDraft(soul:Record<string,any>,patch:Record<string,any>={}):Record<string,any> {
  const presetArt=soul.presetId?martialSoulArtwork(soul):undefined;
  const artId=soul.artId||(presetArt&&presetArt.key!=='unknown'?presetArt.key:undefined);
  return {...soul,presetId:undefined,...(artId?{artId}:{}),...patch};
}


/** Manual edits become the starting point of the next advisor round. */
export function rememberManualSoul(workspace:CreationWorkspace,index:number):CreationWorkspace {
  const advice=workspace.advisors[index];
  if(!advice?.session)return workspace;
  return {...workspace,advisors:{...workspace.advisors,[index]:{...advice,session:{...advice.session,draft:clone(workspace.config.martialSoulDrafts[index])},proposal:null}}};
}


export function rememberSoulAdvice(workspace:CreationWorkspace,index:number,advice:{mode?:'question'|'proposal';session:Record<string,any>;inspection:any;advisorReply:string}):CreationWorkspace {
  // Advice remains separate from the player's active configuration until adoption.
  const proposal=advice.mode==='question' ? workspace.advisors[index]?.proposal ?? null : advice.inspection?.draft ? clone(advice.inspection.draft) : null;
  return {...workspace,advisors:{...workspace.advisors,[index]:{session:clone(advice.session),proposal}},requests:{...workspace.requests,[index]:''}};
}
