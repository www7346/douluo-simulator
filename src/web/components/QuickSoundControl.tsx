import RangeInput from './RangeInput';
import {useEffect,useState} from 'react';
import {Button,Modal} from '../components';
import {useGame} from '../game-context';
import {describeError} from '../error-text';
import {gameAudio} from '../game-audio';
import type {SoundSettings} from '../audio-settings';
import UiIcon from './UiIcon';

export default function QuickSoundControl(){
  const {controller,view}=useGame();
  const [open,setOpen]=useState(false);
  const [draft,setDraft]=useState<SoundSettings>(view.sound);
  const [message,setMessage]=useState('');
  const dirty=JSON.stringify(draft)!==JSON.stringify(view.sound);
  useEffect(()=>{if(open)gameAudio.configure(draft);},[open,draft]);
  useEffect(()=>{if(open)return()=>gameAudio.configure(controller.settingsDraft().sound);},[open,controller]);
  const change=(next:SoundSettings)=>{setDraft(next);setMessage('');};
  const save=()=>{try{controller.saveSound(draft);setMessage('音量已保存，下次打开继续使用。');}catch(error){setMessage('未能保存：'+describeError(error));}};
  const silent=view.sound.muted||view.sound.master===0;
  return <>
    <button type="button" className="quick-sound-button" aria-label="声音与音量" aria-haspopup="dialog" aria-expanded={open} data-sound="none" onClick={()=>{setDraft({...view.sound});setMessage('');setOpen(true);}}>
      <UiIcon name={silent?'muted':'sound'}/><span>声音</span><small>{silent?'静音':view.sound.master+'%'}</small>
    </button>
    <Modal open={open} title="声音与音量" className="quick-sound-modal" onClose={()=>setOpen(false)} actions={<><Button variant="ghost" data-sound="none" onClick={()=>setOpen(false)}>{dirty?'取消':'关闭'}</Button><Button data-sound="none" onClick={save}>保存音量</Button></>}>
      <p className="muted">调整后立即试听，满意后保存。未保存的调整会在关闭时还原。</p>
      <div className="quick-sound-switch-row"><span>游戏声音<small>{draft.muted?'音乐与音效已关闭':draft.master===0?'总音量为零':`音乐${draft.music?'已开启':'已关闭'}，音效${draft.effects?'已开启':'已关闭'}`}</small></span><button type="button" className="quick-sound-switch" role="switch" aria-label="开启游戏声音" aria-checked={!draft.muted} data-sound="none" onClick={()=>change({...draft,muted:!draft.muted})}><i aria-hidden="true"/><span>{draft.muted?'关':'开'}</span></button></div>
      <div className="sound-sliders">{(['master','music','effects'] as const).map((key,index)=><label key={key}><span>{['总音量','音乐音量','音效音量'][index]}<output>{draft[key]}%</output></span><RangeInput type="range" min="0" max="100" step="1" value={draft[key]} aria-label={['总音量','音乐音量','音效音量'][index]} onChange={event=>change({...draft,[key]:Number(event.target.value)})}/></label>)}</div>
      <Button variant="secondary" data-sound="none" disabled={draft.muted||draft.master===0||draft.effects===0} onClick={()=>void gameAudio.unlock().then(()=>gameAudio.play('ascend'))}>试听音效</Button>
      <p className="quick-sound-result" role="status">{message||(dirty?'当前调整尚未保存':'当前音量已保存')}</p>
    </Modal>
  </>;
}
