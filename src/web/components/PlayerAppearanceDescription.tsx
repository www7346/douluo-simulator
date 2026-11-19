import {useRef,useState} from 'react';
import {Button,ModalActions} from '../components';
import {useGame} from '../game-context';
import {useServerQuery} from '../use-game-query';
import QueryStatus from './QueryStatus';
import {playerText} from '../../runtime/player-text';

type Preview={description:string;maximumLength:number;available:boolean;reason:string};
export function AppearanceDescriptionForm({preview,onSaved}:{preview:Preview;onSaved:()=>void}){
 const {controller,state,view}=useGame();
 const [original]=useState(preview.description),[description,setDescription]=useState(preview.description);
 const [mode,setMode]=useState<'correction'|'change'>('correction'),[confirm,setConfirm]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const stale=(state.人物?.列表?.[state.角色?.主控单位ID]?.appearance??'')!==original;
 const save=async()=>{
  if(mode==='change'&&!confirm){setConfirm(true);return;}
  setSaving(true);setError('');
  try{await controller.dispatch('player.edit-appearance',{mode,description,expectedAppearance:original});controller.notify(mode==='correction'?'样貌描述已修正':'当前外貌已更新','success');onSaved();}
  catch(e){setError(playerText((e as Error).message,state));setConfirm(false);}finally{setSaving(false);}
 };
 return <div className="player-appearance-description">
  <fieldset disabled={saving||view.busy}><legend>这次修改属于</legend>
   <label><input type="radio" name="appearance-edit-mode" value="correction" checked={mode==='correction'} onChange={()=>{setMode('correction');setConfirm(false);}}/>修正文案</label>
   <p className="muted">补充或润色原有样貌。之后按新文案描写，人物仍是原来的样子。</p>
   <label><input type="radio" name="appearance-edit-mode" value="change" checked={mode==='change'} onChange={()=>{setMode('change');setConfirm(false);}}/>实际改变外貌</label>
   <p className="muted">从现在起采用新样貌，亲眼看到变化的人会记得经过；其他人等再次见面才看到。人物身份、关系和既往经历继续保留。</p>
   <label>样貌描述<textarea aria-label="样貌描述" rows={7} maxLength={preview.maximumLength} value={description} onChange={e=>{setDescription(e.target.value);setConfirm(false);}}/></label>
   <p className="muted">可描写发色、眉眼、体态和衣着。性别、年龄、属性和能力沿用现有档案。</p>
   <small>{description.length} / {preview.maximumLength} 字</small>
  </fieldset>
  <p className="muted">头像与立绘在原入口单独更换。隐藏身份仍使用人物已有的伪装能力。</p>
  {!preview.available&&<p role="status">{preview.reason}</p>}
  {stale&&<p role="alert">当前样貌已经变化，请关闭后重新打开，再修改最新描述。</p>}
  {confirm&&<div role="status"><p>当前样貌</p><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{original}</p><p>修改后</p><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{description.trim()}</p><p>确认后记录这次实际变化。</p><Button variant="ghost" disabled={saving} onClick={()=>setConfirm(false)}>继续编辑</Button></div>}
  {error&&<p role="alert">{error}</p>}
  <ModalActions><Button disabled={!preview.available||stale||saving||view.busy||!description.trim()||description.trim()===original} onClick={()=>void save()}>{saving?'保存中…':mode==='correction'?'保存文案修正':confirm?'确认改变外貌':'预览并确认改变'}</Button></ModalActions>
 </div>;
}
export default function PlayerAppearanceDescription({onSaved}:{onSaved:()=>void}){
 const query=useServerQuery<Preview>('presentation.player-appearance');
 const last=useRef<Preview|undefined>(undefined);if(query.data)last.current=query.data;
 return <><QueryStatus query={query}/>{last.current&&<AppearanceDescriptionForm preview={last.current} onSaved={onSaved}/>}</>;
}
