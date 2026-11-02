import {ActionSection} from '../components';
import type {BattlePreferences} from '../../shared/battle-preferences';
export default function BattlePreferenceFields({value,onChange,disabled=false,current=false}:{value:BattlePreferences;onChange:(value:BattlePreferences)=>void;disabled?:boolean;current?:boolean}){
 const set=<K extends keyof BattlePreferences>(key:K,next:BattlePreferences[K])=>onChange({...value,[key]:next});
 return <fieldset className="battle-preference-fields" disabled={disabled}>
  <label>{current?'本场战斗模式':'默认战斗模式'}<select value={value.defaultMode} onChange={e=>set('defaultMode',e.target.value as BattlePreferences['defaultMode'])}><option value="auto">自动战斗</option><option value="manual">手动战斗</option></select></label>
  <p>战后正文：手动生成</p>
  <p className="muted">胜负、资源变化和行动判定直接显示。想看故事时，再点击“生成战报正文”调用作家。</p>
  <label>主角自动使用消耗品<select value={value.consumables} onChange={e=>set('consumables',e.target.value as BattlePreferences['consumables'])}><option value="never">不自动使用</option><option value="recovery">仅恢复类</option><option value="all">允许全部</option></select></label>
  <p className="muted">包括药剂、辅助食品和一次性暗器。仅恢复类限回血、回魂和净化；手动用物及已服丹药照常生效。同行使用自己的物品另按其战术处理。</p>
  <ActionSection title={<>高级自动策略</>}><label>保留魂力比例（%）<input type="number" min="0" max="100" step="1" value={value.reservePercent} onChange={e=>set('reservePercent',e.target.valueAsNumber)}/></label><label>低生命尝试撤退（%）<input type="number" min="0" max="100" step="1" value={value.retreatPercent} onChange={e=>set('retreatPercent',e.target.valueAsNumber)}/></label><p className="muted">撤退设为 0 时不主动撤退；达到设定阈值且允许撤离时，角色尝试撤退。</p></ActionSection>
 </fieldset>;
}
