import {downloadJson} from '../file-transfer';
import DesktopUpdate from '../components/DesktopUpdate';
import {readBattlePreferences,validateBattlePreferences} from '../../shared/battle-preferences';
import BattlePreferenceFields from '../components/BattlePreferenceFields';
import '../components/battle-settings.css';
import ModelPromptEditor from '../components/ModelPromptEditor';
import StoryLengthSettings from '../components/StoryLengthSettings';
import CharacterRepairPanel from '../components/CharacterRepairPanel';
import DiagnosticExportButton from '../components/DiagnosticExportButton';
import StorySettings from '../components/StorySettings';
import ModelConsole from '../components/ModelConsole';
import {playReturnRoute} from '../../runtime/play-scene';
import {useEffect,useState,useSyncExternalStore} from 'react';
import {Button,Modal,Panel} from '../components';
import {useGame} from '../game-context';
import {describeError} from '../error-text';
import type {PerformanceLevel} from '../controller';
import {getOfflineStatus,subscribeOffline,offlineMessages,getVersionStatus} from '../offline-support';
import {playerText} from '../../runtime/player-text';
import SoundSettingsPanel from '../components/SoundSettingsPanel';
import {gameAudio} from '../game-audio';
import {StoryWritingLog} from '../components/StoryWritingLog';
import {emptyStoryPromptConfig,type StoryPromptConfig} from '../../runtime/story-prompts';

const PERFORMANCE:Array<{id:PerformanceLevel;label:string;note:string}>=[
  {id:'cinematic',label:'华丽',note:'完整光晕、漂移星尘与技能轨迹'},
  {id:'standard',label:'标准',note:'保留重点动效，平衡质感与耗能'},
  {id:'smooth',label:'流畅',note:'减少粒子、模糊与持续动画'},
  {id:'reduced',label:'减少动态',note:'关闭非必要位移与闪烁'},
];
const TABS=[{id:'connection',label:'模型与用途'},{id:'prompts',label:'提示词'},{id:'console',label:'模型请求记录'},{id:'battle',label:'战斗'},{id:'sound',label:'声音'},{id:'display',label:'画面与数据'}] as const;
export default function SystemPage() {
  const {controller,view,state}=useGame();
  const offline=useSyncExternalStore(subscribeOffline,getOfflineStatus,getOfflineStatus);
  const versions=useSyncExternalStore(subscribeOffline,getVersionStatus,getVersionStatus);
  const [draft,setDraft]=useState(()=>controller.settingsDraft());
  const [saved,setSaved]=useState(()=>JSON.stringify(controller.settingsDraft()));
  const [battleDraft,setBattleDraft]=useState(()=>readBattlePreferences(state)),[savedBattle,setSavedBattle]=useState(()=>JSON.stringify(readBattlePreferences(state)));
  const battleAvailable=!!state.角色?.主控单位ID,battleDirty=battleAvailable&&JSON.stringify(battleDraft)!==savedBattle;
  useEffect(()=>{const value=controller.battlePreferences();setBattleDraft(value);setSavedBattle(JSON.stringify(value));},[controller,view.profileId,view.sessionId]);
  const [storyPrompts,setStoryPrompts]=useState<StoryPromptConfig>(emptyStoryPromptConfig),[savedPrompts,setSavedPrompts]=useState(''),[promptsReady,setPromptsReady]=useState(false),[saving,setSaving]=useState(false);
  useEffect(()=>{gameAudio.configure(draft.sound);},[draft.sound]);
  useEffect(()=>()=>{gameAudio.configure(controller.settingsDraft().sound);},[controller]);
  const [libraryKeys,setLibraryKeys]=useState<Record<string,string>>({});
  const [tab,setTab]=useState<string>(()=>{const saved=controller.preferences.get('settings-tab','connection');return TABS.some(t=>t.id===saved)?saved:'connection';});
  const [selectedPrompt,setSelectedPrompt]=useState('story-writer');
  const [message,setMessage]=useState('设置已载入');
  useEffect(()=>{let current=true;void controller.storyPrompts().then(value=>{if(current){setStoryPrompts(value);setSavedPrompts(JSON.stringify(value));setPromptsReady(true);}}).catch(e=>{if(current)setMessage('提示词未载入：'+describeError(e));});return()=>{current=false;};},[controller]);
  const [exit,setExit]=useState<string|null>(null);
  const exportEvidence=async()=>{try{await downloadJson(await controller.exportModelEvidence(),'斗罗大陆-本旅程生成记录.json');}catch(error){controller.notify(describeError(error),'danger');}};
  const [history,setHistory]=useState<string[]>([]);
  useEffect(()=>{void controller.listHistory().then(records=>setHistory(records.slice(-12).reverse().map(record=>playerText(record.event.summary,state,'旅程已更新')))).catch(()=>setHistory(['近期记录暂时无法读取，请重新打开设置。']));},[controller,view.profileId]);
  const profile=draft.modelProfile;
  const dirty=battleDirty||JSON.stringify(draft)!==saved||Object.keys(libraryKeys).length>0||(promptsReady&&JSON.stringify(storyPrompts)!==savedPrompts);
  useEffect(()=>{const listener=(e:BeforeUnloadEvent)=>{if(dirty){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',listener);return()=>window.removeEventListener('beforeunload',listener);},[dirty]);
  const save=async()=>{
    if(saving||!promptsReady)return false;setSaving(true);let otherSettingsSaved=false;
    try{
      if(battleDirty)validateBattlePreferences(battleDraft);
      await controller.savePromptSettings(draft,libraryKeys,storyPrompts);
      const next=controller.settingsDraft();setDraft(next);setSaved(JSON.stringify(next));setLibraryKeys({});setSavedPrompts(JSON.stringify(storyPrompts));otherSettingsSaved=true;
      if(battleDirty)await controller.saveBattlePreferences(battleDraft);
      setSavedBattle(JSON.stringify(controller.battlePreferences()));setMessage(controller.modelKeys.warning||'设置已保存 · '+new Date().toLocaleTimeString());return true;
    }catch(e){setMessage((otherSettingsSaved?'其他设置已保存；战斗设置未保存：':'未保存：')+describeError(e));return false;}finally{setSaving(false);}
  };
  const leave=(route:string)=>{const origin=playReturnRoute(state,location.hash);if(route==='/saves'&&origin.startsWith('/competition'))route+='?from=competition'+(origin.includes('?')?'&'+origin.split('?')[1]:'');if(dirty)setExit(route);else location.hash=route;};
  useEffect(()=>{const listener=(event:Event)=>leave((event as CustomEvent<{route?:string}>).detail?.route??'/home');window.addEventListener('douluo:leave-settings',listener);return()=>window.removeEventListener('douluo:leave-settings',listener);},[dirty]);
  return <div className="menu-page settings-page"><div className="menu-page__top"><Button variant="ghost" onClick={()=>leave('/home')}>← 返回首页</Button>{(state?.角色?.主控单位ID||view.creationWorkspace)&&<Button variant="ghost" onClick={()=>leave(state?.角色?.主控单位ID?playReturnRoute(state,location.hash):'/creation')}>{state?.角色?.主控单位ID?'返回旅程':'继续角色创建'}</Button>}</div>
    <section className="page-heading"><span className="eyebrow">让旅程适合你的节奏</span><h1>设置</h1></section>
    <div className="settings-savebar"><div><strong>{dirty?'有未保存的修改':'已保存'}</strong><p role="status" data-testid="settings-result">{message}</p></div><Button disabled={saving||!promptsReady} onClick={()=>void save()} data-testid="save-settings">{saving?'正在保存…':'保存设置'}</Button></div>
    <div className="settings-layout" inert={saving}><nav className="settings-tabs" aria-label="设置分类">{TABS.map(item=><button key={item.id} className={tab===item.id?'is-active':''} aria-current={tab===item.id?'page':undefined} onClick={()=>{controller.preferences.set('settings-tab',item.id);setTab(item.id);}}>{item.label}</button>)}</nav><div className="settings-content">
    {tab==='battle'&&<><Panel title="战斗方式与战报" eyebrow="本旅程默认"><p className="muted">默认设置用于之后开始的战斗，随本世界存档保存。当前交战可在“本场设置”中调整。</p>{!battleAvailable&&<p>进入旅程后，可在这里保存本世界的战斗方式。</p>}<BattlePreferenceFields value={battleDraft} onChange={setBattleDraft} disabled={!battleAvailable||view.busy}/></Panel><Panel title="模型战术"><label><input type="checkbox" data-testid="model-combat-toggle" checked={draft.modelCombatEnabled} onChange={e=>setDraft(v=>({...v,modelCombatEnabled:e.target.checked}))}/>启用模型战术</label><p className="muted">允许模型参与战术判断；与自动战斗和战报写作分别设置。</p></Panel></>}
    {tab==='sound'&&<SoundSettingsPanel value={draft.sound} onChange={sound=>setDraft(current=>({...current,sound}))}/>}
    {tab==='connection'&&<><Panel title="模型服务"><label><input type="checkbox" checked={draft.modelEnabled} onChange={e=>setDraft(v=>({...v,modelEnabled:e.target.checked}))}/>启用模型创作</label></Panel><ModelConsole profile={profile} onChange={modelProfile=>setDraft(v=>({...v,modelProfile}))} keys={libraryKeys} onKeys={setLibraryKeys} onEditPrompt={task=>{setSelectedPrompt(task);setTab('prompts');controller.preferences.set('settings-tab','prompts');}}/></>}
    {tab==='prompts'&&<ModelPromptEditor profile={profile} onChange={modelProfile=>setDraft(v=>({...v,modelProfile}))} selected={selectedPrompt} onSelect={setSelectedPrompt} storyPrompts={storyPrompts} onStoryPromptsChange={setStoryPrompts} ready={promptsReady}/>}
    {tab==='console'&&<><StoryLengthSettings value={storyPrompts} onChange={setStoryPrompts} disabled={!promptsReady} onEditPrompt={()=>{setSelectedPrompt('writer-length');setTab('prompts');controller.preferences.set('settings-tab','prompts');}}/><CharacterRepairPanel/></>}<div hidden={tab!=='console'}>{state.扩展?.story&&<StorySettings prompts={storyPrompts} setPrompts={setStoryPrompts} promptsReady={promptsReady}/>}</div>
    {tab==='console'&&<Panel title="模型请求记录" eyebrow="当前会话"><p className="muted">查看本次会话的请求参数、用时和结果。</p><p>当前任务：{view.modelTask?.label ?? '暂无进行中的请求'}</p>{view.modelTask&&<Button variant="secondary" onClick={()=>controller.cancelModelTask()}>取消当前请求</Button>}<div className="model-log-list">{view.modelLogs.map(log=><details key={log.id}><summary>{log.label} · {log.status} · {new Date(log.at).toLocaleTimeString()}</summary>{!log.detail?.storyWriting&&<p>{log.detail?.model??'模型未记录'} · {((log.detail?.elapsedMs??0)/1000).toFixed(2)} 秒 · {log.detail?.attempts?.length??0} 次请求{log.detail?.attempts?.some((a:any)=>a.usage?.total_tokens!==undefined)?' · '+log.detail.attempts.reduce((sum:number,a:any)=>sum+(a.usage?.total_tokens??0),0)+' Token':''}</p>}<StoryWritingLog detail={log.detail}/><details><summary>请求详情</summary><pre className="prompt-preview">{JSON.stringify(log.detail,null,2)}</pre></details></details>)}</div>{!view.modelLogs.length&&<p className="muted">使用创作顾问或测试连接后，这里会出现本次会话的请求记录。</p>}</Panel>}
    {tab==='display'&&<><Panel title="画面表现"><div className="performance-grid">{PERFORMANCE.map(option=><button key={option.id} className={draft.performance===option.id?'is-active':''} onClick={()=>setDraft({...draft,performance:option.id})}><b>{option.label}</b><span>{option.note}</span></button>)}</div></Panel><Panel title="旅程与本地数据"><p role="status">{offlineMessages[offline]}</p><p className="muted">角色、世界和旅程存档保存在当前浏览器。删除世界、导入导出与备份恢复集中在存档管理中。</p><Button variant="secondary" onClick={()=>leave('/saves')}>管理世界与存档</Button></Panel></>}
    {tab==='console'&&<div className="field-actions"><DiagnosticExportButton/><Button variant="secondary" onClick={()=>void exportEvidence()}>导出本旅程生成记录</Button><Button variant="ghost" onClick={()=>controller.clearModelLogs()}>清空记录</Button><p className="muted">故障诊断包含连接、错误和进度摘要；生成记录包含本旅程保存的模型请求与结果。两者均隐藏密钥。备份或换设备请到存档页导出完整存档。清空上方列表只清除本次会话的显示。</p></div>}
    {tab==='display'&&<Panel title="游戏版本与更新">{window.douluoDesktop?<DesktopUpdate/>:<><p>当前页面：{versions.page}</p><p>游戏入口：{versions.server}</p><p>已缓存界面：{versions.active}</p><p>待启用版本：{versions.waiting}</p><p role="status">{versions.message}</p><p className="muted">需要手动更新时，请返回首页点击“手动更新”。</p></>}</Panel>}
    {tab==='console'&&state.远征?.当前&&<Panel title="探索数据（高级）"><details><summary>查看本次探索数据</summary><pre className="prompt-preview">{JSON.stringify(Object.values(state.远征.当前.map.nodes).map((node:any)=>({房间:node.id,类型:node.type,预算:node.budget,实际价值:node.encounter?.spent,余款:node.encounter?.residual,魂兽:node.encounter?.roster.map((beast:any)=>({血脉:beast.lineage.grade.name,年限:beast.years,账本:beast.valueBreakdown,技能:beast.compilation.skills.map((skill:any)=>({费用:skill.budget,内容指纹:skill.immutableHash}))})),宝箱:node.chest})),null,2)}</pre></details></Panel>}
    {tab==='display'&&<Panel title="最近的足迹"><div className="history-list" aria-label="最近历史">{history.length?history.map((text,index)=><p key={index}>{text}</p>):<p className="muted">还没有新的旅程记录。</p>}</div></Panel>}
    </div></div>
    <Modal open={!!exit} title="设置尚未保存" onClose={()=>{if(!saving)setExit(null);}} actions={<><Button variant="ghost" disabled={saving} onClick={()=>setExit(null)}>继续编辑</Button><Button variant="secondary" disabled={saving} onClick={()=>{location.hash=exit!;}}>放弃修改</Button><Button disabled={saving||!promptsReady} onClick={async()=>{if(await save())location.hash=exit!;}}>保存并返回</Button></>}><p>是否保存本次修改后离开？</p><p role="status">{message}</p></Modal>
  </div>;
}
