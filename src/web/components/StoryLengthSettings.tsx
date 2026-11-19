import {Button,Panel} from '../components';
import type {StoryPromptConfig} from '../../runtime/story-prompts';
import {MAX_STORY_TARGET_CHARS} from '../../shared/story-length';

export default function StoryLengthSettings({value,onChange,disabled,onEditPrompt}:{value:StoryPromptConfig;onChange:(value:StoryPromptConfig)=>void;disabled:boolean;onEditPrompt:()=>void}){
 const automatic=()=>{const next={...value};delete next.writerTargetChars;onChange(next);};
 const invalid=value.writerTargetChars!==undefined&&(!Number.isSafeInteger(value.writerTargetChars)||value.writerTargetChars<1||value.writerTargetChars>MAX_STORY_TARGET_CHARS);
 return <Panel title="正文篇幅"><fieldset disabled={disabled}>
  <label>目标字数<input type="number" min={1} max={MAX_STORY_TARGET_CHARS} step={1} placeholder="自动" value={value.writerTargetChars??''} aria-invalid={invalid} onChange={event=>{if(event.target.value==='')automatic();else onChange({...value,writerTargetChars:Number(event.target.value)});}}/></label>
  <p>正文和重写按此字数左右生成。留空采用日常默认篇幅，点击上方“保存设置”后生效。</p>
  {invalid&&<p role="alert">请填写1至{MAX_STORY_TARGET_CHARS}的整数，或留空。</p>}
  <div className="field-actions"><Button variant="secondary" onClick={automatic}>恢复自动篇幅</Button><Button variant="ghost" onClick={onEditPrompt}>编辑字数要求提示词</Button></div>
 </fieldset></Panel>;
}
