import {useEffect,useState} from 'react';
import {effectiveBattlePreferences,type BattlePreferences} from '../../shared/battle-preferences';
import {useGame} from '../game-context';
import {ActionSection,Button} from '../components';
import BattlePreferenceFields from './BattlePreferenceFields';
import './battle-settings.css';
export default function BattleQuickSettings(){
 const {controller,state,view}=useGame(),[expanded,setExpanded]=useState(false);
 const [draft,setDraft]=useState<BattlePreferences>(()=>effectiveBattlePreferences(state)),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{setExpanded(false);setError('');},[view.sessionId,state.战斗?.id]);
 if(state.战斗?.状态!=='进行中')return null;
 const open=async()=>{
  setBusy(true);setError('');
  const battleId=state.战斗.id,wasAutomatic=!!state.战斗.扩展?.automation?.enabled;
  try{await controller.pauseAutomaticBattle();const current:any=controller.runtime.getSnapshot().state;if(current.战斗?.id!==battleId||current.战斗.状态!=='进行中'){setExpanded(false);return;}setDraft({...effectiveBattlePreferences(current),defaultMode:wasAutomatic?'auto':'manual'});}
  catch(e){setError((e as Error).message);}finally{setBusy(false);}
 };
 return <ActionSection title="本场设置" className="battle-quick-settings" open={expanded} onOpenChange={next=>{setExpanded(next);if(next)void open();}}><div className="battle-quick-settings__panel"><h3>本场战斗设置</h3><p className="muted">调整前先暂停交战；保存后按所选模式继续。设置适用于本场交战。</p><BattlePreferenceFields value={draft} onChange={setDraft} current disabled={busy||view.busy}/>{error&&<p role="alert">{error}</p>}<div className="field-actions"><Button disabled={busy||view.busy} onClick={async()=>{setBusy(true);setError('');try{await controller.saveBattlePreferences(draft,'battle');setExpanded(false);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>保存本场设置</Button><Button variant="ghost" disabled={busy} onClick={()=>setExpanded(false)}>关闭并保持暂停</Button><a className="button button--ghost" href="#/system" onClick={()=>controller.preferences.set('settings-tab','battle')}>完整战斗设置</a></div></div></ActionSection>;
}
