import {readBattlePreferences,effectiveBattlePreferences,validateBattlePreferences} from '../shared/battle-preferences';
export function initializeBattlePreferences(state:any):void {
 if(state.战斗?.状态!=='进行中'||state.战斗.扩展?.automation)return;
 const preferences=readBattlePreferences(state);
 state.战斗.扩展.automation={enabled:preferences.defaultMode==='auto',steps:0,preferences};
 state.战斗.扩展.strategy??={focusTargetId:null,protectTargetId:null,reservePercent:preferences.reservePercent,retreatPercent:preferences.retreatPercent};
}
export function setBattlePreferences(state:any,payload:any){
 if(!payload||Object.keys(payload).some(k=>!['scope','preferences'].includes(k))||!['world','battle'].includes(payload.scope)||!Object.hasOwn(payload,'preferences')||payload.preferences===undefined)throw Error('请选择要调整的战斗设置');
 const preferences=validateBattlePreferences(payload.preferences);
 if(payload.scope==='world'){
  const automation=state.战斗?.扩展?.automation;
  if(state.战斗?.状态==='进行中'&&!automation?.preferences){
   const current=automation??{enabled:false,steps:0};
   current.preferences={...effectiveBattlePreferences(state),defaultMode:current.enabled||current.waitingStoryTurn?'auto':'manual'};
   state.战斗.扩展.automation=current;
  }
  state.扩展??={};state.扩展.battlePreferences=preferences;
 }
 else{
  if(state.战斗?.状态!=='进行中')throw Error('当前没有进行中的战斗');
  const previous=state.战斗.扩展.automation,enabled=preferences.defaultMode==='auto';
  state.战斗.扩展.automation={...previous,enabled,steps:enabled?0:previous?.steps??0,preferences};delete state.战斗.扩展.automation.waitingStoryTurn;
  const strategy=state.战斗.扩展.strategy??{focusTargetId:null,protectTargetId:null};
  state.战斗.扩展.strategy={...strategy,reservePercent:preferences.reservePercent,retreatPercent:preferences.retreatPercent};
 }
 return {state,receipt:{type:'battle-preferences',scope:payload.scope,preferences,summary:payload.scope==='world'?'已保存本旅程的战斗设置':'已更新本场战斗设置'}};
}
export function setAutomaticBattle(state:any,enabled:boolean){
 if(state.战斗?.状态!=='进行中')throw Error('当前没有进行中的战斗');
 if(typeof enabled!=='boolean')throw Error('自动战斗开关必须为布尔值');
 const previous=state.战斗.扩展.automation,preferences={...effectiveBattlePreferences(state),defaultMode:enabled?'auto' as const:'manual' as const};
 state.战斗.扩展.automation={...previous,enabled,steps:enabled?0:previous?.steps??0,preferences};delete state.战斗.扩展.automation.waitingStoryTurn;
 return {state,receipt:{type:'battle-automation',enabled,summary:enabled?'已开启自动战斗':'已交还手动控制'}};
}
