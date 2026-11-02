import PresetWirePreview from './PresetWirePreview';
import {PROMPT_CATALOG} from '../../runtime/model-prompts';
import {modelPromptText} from '../../runtime/model-prompt-templates';
import type {ModelProfile} from '../../runtime/model-gateway';
import {Button,Panel} from '../components';
import type {StoryPromptConfig} from '../../runtime/story-prompts';
import WriterPromptEditor from './WriterPromptEditor';
import GlobalPromptEditor from './GlobalPromptEditor';
import {selectWritingPreset} from '../../runtime/writing-preset-application';
import {writingSet} from '../../runtime/writing-preset-catalog';
import {switchWritingPreset} from '../../runtime/prompt-presets';
import {activeWriterPromptParts} from '../../runtime/story-writer-prompts';

type Profile=Omit<ModelProfile,'apiKey'>;
export default function ModelPromptEditor({profile,onChange,selected,onSelect,storyPrompts,onStoryPromptsChange,ready}:{profile:Profile;onChange:(profile:Profile)=>void;selected:string;onSelect:(id:string)=>void;storyPrompts:StoryPromptConfig;onStoryPromptsChange:(value:StoryPromptConfig)=>void;ready:boolean}){
 const entry=PROMPT_CATALOG.find(p=>p.id===selected)??PROMPT_CATALOG[0];
 const text=modelPromptText(profile,entry.id),custom=profile.promptOverrides?.[entry.id]!==undefined;
 const inherits=['story-rewrite'].includes(entry.id);
 const writerStyle=activeWriterPromptParts(storyPrompts).filter(part=>part.kind==='style'||part.category==='style'||part.exclusiveGroup==='文风').map(part=>part.name).join('、')||'未启用';
 return <Panel title="提示词">
  <p>选择用途，直接修改模型使用的指令。点击“保存设置”后生效。</p>
  <PresetWirePreview profile={profile} config={storyPrompts}/>
  <div className="prompt-workbench">
   <nav aria-label="提示词用途"><button className={selected==='global-prompts'?'is-active':''} aria-pressed={selected==='global-prompts'} onClick={()=>onSelect('global-prompts')}>全局提示词{profile.globalPrompts?.some(part=>part.content.length>0)&&<small>已设置</small>}</button>{PROMPT_CATALOG.map(prompt=><button key={prompt.id} className={selected!=='global-prompts'&&entry.id===prompt.id?'is-active':''} aria-pressed={selected!=='global-prompts'&&entry.id===prompt.id} onClick={()=>onSelect(prompt.id)}>{prompt.label}{profile.promptOverrides?.[prompt.id]!==undefined&&<small>已修改</small>}</button>)}</nav>
   {selected==='global-prompts'?<GlobalPromptEditor value={profile} onChange={globalConfig=>onChange({...profile,...globalConfig})} writerStyle={writerStyle} onSwitch={family=>{const set=writingSet(family),next=set?selectWritingPreset(profile,storyPrompts,set.preset.id as import('../../runtime/writing-preset-catalog').WritingPresetId,set.modelFamily):switchWritingPreset(profile,storyPrompts,family);onChange(next.globalConfig);onStoryPromptsChange(next.storyPrompts);}} disabled={!ready}/>:entry.id==='story-writer'?<WriterPromptEditor profile={profile} onProfileChange={onChange} value={storyPrompts} onChange={onStoryPromptsChange} disabled={!ready}/>:<div>
    <label>{entry.label}提示词<textarea className="prompt-editor" aria-label={`${entry.label}提示词`} rows={18} maxLength={24000} spellCheck={false} value={text} onChange={e=>onChange({...profile,promptOverrides:{...profile.promptOverrides,[entry.id]:e.target.value}})}/></label>
    {inherits&&<p>{custom?'正在使用单独设置的提示词。':'当前沿用小说正文提示词。'}</p>}
    <div className="field-actions"><Button variant="secondary" onClick={()=>{const next={...profile.promptOverrides};delete next[entry.id];onChange({...profile,promptOverrides:next});}}>{inherits?'恢复沿用小说正文':'恢复默认提示词'}</Button><span className="muted">{text.length} / 24000 字</span></div>
   </div>}
  </div>
 </Panel>;
}
