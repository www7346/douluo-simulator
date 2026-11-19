import {upgradeSisiContent} from './sisi-content-upgrade';
import {validateCaptivity} from './story-captivity';
import {validateNpcAutonomy} from './npc-autonomy';
import {validatePersonChangeReactions} from './person-change-reaction';
import {validateDeferredStoryNpcs} from './story-npc-mechanics';
import {validateBattleStrategy} from './battle-strategy';
import {rules} from '../rules';
import {validateBattlePreferences} from '../shared/battle-preferences';
import {validateStoryLedger} from './story-turns';
import {validateStoryCommitments} from './story-commitments';
import {validateStoryObjects} from './story-objects';
import {validateFreeActions} from './story-free-actions';
import {validateStoryAddresses} from './story-addresses';

/** Validate and return a detached current-format world, including compatible content revisions. */
import {validateCharacterProfiles} from './character-profile';
export class SavedStateValidationError extends Error {
 constructor(message:string){super(message);this.name='SavedStateValidationError';}
}
export function validateCurrentState(input:unknown):Record<string,any>{
 let state=input as Record<string,any>;
 if(!state||state.系统?.schema_version!==rules.foundation.VERSION||state.系统.ruleset_version!==rules.foundation.VERSION)throw new Error('这份存档格式不受支持，请使用当前版本的存档');
 state=upgradeSisiContent(state);
 validateBattlePreferences(state.扩展?.battlePreferences);
 const narration=state.扩展?.battleNarration;
 if(narration!==undefined&&(!narration||typeof narration!=='object'||Array.isArray(narration)))throw Error('战报撰写记录无效');
 for(const [id,value] of Object.entries(narration??{}) as [string,any][]){
  if(!state.扩展?.battleReports?.[id]||!value||Object.keys(value).some(k=>!['kind','turn'].includes(k))||!['local','writer'].includes(value.kind)||!Number.isSafeInteger(value.turn)||value.turn<1)throw Error('战报撰写记录无效');
 }
 validateStoryLedger(state);
 validateStoryObjects(state);
 validateFreeActions(state);
 validateCaptivity(state);
 validateStoryAddresses(state);
 validateDeferredStoryNpcs(state);
 validateCharacterProfiles(state);
 validateStoryCommitments(state);
 validateNpcAutonomy(state);
 validatePersonChangeReactions(state);
 for(const report of Object.values(state.扩展?.battleReports??{}) as any[]){if(report.battlePreferences!==undefined)validateBattlePreferences(report.battlePreferences);if(report.boss!==undefined&&typeof report.boss!=='boolean')throw Error('战报场景记录无效');}
 for(const background of Object.values(state.世界?.backgroundBattles??{}) as any[]){
  if(background.扩展?.automation?.preferences!==undefined)validateBattlePreferences(background.扩展.automation.preferences);
  if(background.扩展?.strategy!==undefined)validateBattleStrategy(background.扩展.strategy);
  if(background.扩展?.automation?.enabled)throw Error('后台战斗由世界时钟推进，不能重复启用前台自动战斗');
 }
 if(state.战斗?.扩展?.strategy!==undefined)validateBattleStrategy(state.战斗.扩展.strategy);
 const automation=state.战斗?.扩展?.automation;
 if(automation?.preferences!==undefined)validateBattlePreferences(automation.preferences);
 if(automation!==undefined&&(typeof automation!=='object'||!automation||typeof automation.enabled!=='boolean'||!Number.isSafeInteger(automation.steps)||automation.steps<0||automation.steps>600||automation.enabled&&automation.steps>=600||automation.waitingStoryTurn!==undefined&&(!Number.isSafeInteger(automation.waitingStoryTurn)||automation.waitingStoryTurn<1||automation.enabled)))throw Error('自动战斗存档状态无效');
 const check=(compiled:any)=>{
  if(compiled?.attributeVersion!==rules.martialSoul.ATTRIBUTE_VERSION)throw new Error('这份武魂属性格式不受支持，请使用当前版本的存档');
 };
 for(const soul of Object.values(state.武魂?.列表??{}) as any[]){const compiled=soul.扩展?.结构化武魂??soul.结构化武魂;if(compiled)check(compiled);}
 for(const draft of Object.values(state.武魂?.草案?.列表??{}) as any[]){check(draft);if(draft.compiled)check(draft.compiled);}
 for(const beast of Object.values(state.魂兽档案?.列表??{}) as any[]){check(beast.血脉?.definition);check(beast.血脉?.compiled);}
 const obsolete=new Set(['精神防御','灵魂防御']);
 const inspectMechanics=(value:any):void=>{
  if(!value||typeof value!=='object')return;
  for(const [key,child] of Object.entries(value)){
   if(obsolete.has(key)||['属性','parameter'].includes(key)&&obsolete.has(String(child)))throw Error('存档包含旧防御合同，请开启新的2.5故事');
   if(!['历史','description','描述','说明','叙事','prose','text','原文'].includes(key))inspectMechanics(child);
  }
 };
 for(const key of ['战斗单位','武魂','技能','状态实例','物品','研发','魂兽档案'])inspectMechanics(state[key]);
 const validation=rules.expedition.validateCurrentRuntimeState(state);
 if(!validation.pass)throw new SavedStateValidationError(`存档未通过规则校验：${validation.errors.join('；')}`);
 return validation.state;
}
