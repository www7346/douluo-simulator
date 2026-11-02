import RangeInput from './RangeInput';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {Button,Panel} from '../components';
import {gameAudio} from '../game-audio';
import {MUSIC,type MusicScene,type SoundSettings} from '../audio-settings';
import UiIcon from './UiIcon';

export default function SoundSettingsPanel({value,onChange}:{value:SoundSettings;onChange:(value:SoundSettings)=>void}){
  const status=useSyncExternalStore(gameAudio.subscribe,gameAudio.getStatus,gameAudio.getStatus);
  const [track,setTrack]=useState<MusicScene>('cultivation');
  const previousScene=useRef(gameAudio.diagnostics().scene);
  useEffect(()=>()=>gameAudio.setScene(previousScene.current),[]);
  return <Panel title="声音" eyebrow="听见武魂的回响" className="sound-settings">
    <p className="muted">调整到舒服的音量，点击上方“保存设置”后，下次打开仍会保留。</p>
    <label className="toggle-row"><input type="checkbox" checked={value.muted} onChange={e=>onChange({...value,muted:e.target.checked})}/><span>静音</span></label>
    <div className="sound-sliders">{(['master','music','effects'] as const).map((key,i)=><label key={key}><span>{['总音量','音乐音量','音效音量'][i]}<output>{value[key]}%</output></span><RangeInput type="range" min="0" max="100" step="1" value={value[key]} aria-label={['总音量','音乐音量','音效音量'][i]} onChange={e=>onChange({...value,[key]:Number(e.target.value)})}/></label>)}</div>
    <div className="sound-audition"><span className="eyebrow">试听</span><div className="sound-tracks">{(Object.keys(MUSIC) as MusicScene[]).map(scene=><button key={scene} type="button" data-sound="none" aria-pressed={track===scene} onClick={()=>{setTrack(scene);gameAudio.setScene(scene);void gameAudio.unlock();}}><span aria-hidden="true"><UiIcon name={scene==='cultivation'?'ring':scene==='forest'?'forest':'battle'}/></span><b>{MUSIC[scene].label}</b><small>{scene==='cultivation'?'觉醒 · 修炼':scene==='forest'?'林间 · 探索':'比赛 · 战斗'}</small></button>)}</div>
      <div className="field-actions"><Button variant="secondary" data-sound="none" onClick={()=>void gameAudio.unlock().then(()=>gameAudio.play('ascend'))}>试听魂环音效</Button><Button variant="ghost" data-sound="none" onClick={()=>void gameAudio.unlock().then(()=>gameAudio.play('hit'))}>试听战斗音效</Button></div>
      <p role="status">{value.muted||value.master===0?'已静音，取消静音或调高总音量后可试听':status}</p>
    </div>
    <details className="sound-credits"><summary>音乐来源</summary><p>觉醒与修炼：Town Theme RPG — cynicmusic（cynicmusic.com / pixelsphere.org）</p><p>森林猎魂：Forest Ambience — TinyWorlds</p><p>魂师对战：Fairy Battles — MintoDog</p><p>三首配乐由作者在 OpenGameArt 以 CC0 提供；短音效为本项目原创合成。</p><a href="/audio/CREDITS.json" target="_blank" rel="noreferrer">查看素材来源记录</a></details>
  </Panel>;
}
