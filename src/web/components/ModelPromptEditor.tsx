import {useState} from 'react';
import PresetWirePreview from './PresetWirePreview';
import {PROMPT_CATALOG} from '../../runtime/model-prompts';
import {modelPromptText} from '../../runtime/model-prompt-templates';
import type {ModelProfile} from '../../runtime/model-gateway';
import {Button,Modal,Panel} from '../components';
import type {StoryPromptConfig} from '../../runtime/story-prompts';
import WriterPromptEditor from './WriterPromptEditor';
import GlobalPromptEditor from './GlobalPromptEditor';
import {selectWritingPreset} from '../../runtime/writing-preset-application';
import {writingSet} from '../../runtime/writing-preset-catalog';
import {forkWritingPreset,switchWritingPreset,type WritingPresetAddition} from '../../runtime/prompt-presets';

type Profile=Omit<ModelProfile,'apiKey'>;
export default function ModelPromptEditor({profile,onChange,selected,onSelect,storyPrompts,onStoryPromptsChange,ready}:{profile:Profile;onChange:(profile:Profile)=>void;selected:string;onSelect:(id:string)=>void;storyPrompts:StoryPromptConfig;onStoryPromptsChange:(value:StoryPromptConfig)=>void;ready:boolean}){
 const [fork,setFork]=useState<{addition:WritingPresetAddition;onCreated:()=>void}|null>(null);
 const [presetName,setPresetName]=useState(''),[forkError,setForkError]=useState('');
 const entry=PROMPT_CATALOG.find(p=>p.id===selected)??PROMPT_CATALOG[0];
 const text=modelPromptText(profile,entry.id),custom=profile.promptOverrides?.[entry.id]!==undefined;
 const inherits=['story-rewrite'].includes(entry.id);
 const beginFork=(addition:WritingPresetAddition,onCreated:()=>void)=>{
  setPresetName('');setForkError('');setFork({addition,onCreated});
 };
 const createPreset=()=>{
  if(!fork)return;
  try{
   const next=forkWritingPreset(profile,storyPrompts,`personal:${crypto.randomUUID()}`,presetName,fork.addition);
   onChange(next.globalConfig);onStoryPromptsChange(next.storyPrompts);
   fork.onCreated();setFork(null);
  }catch(error){setForkError((error as Error).message);}
 };
 const writerEditor=<WriterPromptEditor profile={profile} onProfileChange={onChange} value={storyPrompts} onChange={onStoryPromptsChange} onFork={beginFork} disabled={!ready}/>;
 return <Panel title="提示词">
  <p>选择用途，直接修改模型使用的指令。点击“保存设置”后生效。</p>
  <PresetWirePreview profile={profile} config={storyPrompts}/>
  <div className="prompt-workbench">
   <nav aria-label="提示词用途"><button className={selected==='global-prompts'?'is-active':''} aria-pressed={selected==='global-prompts'} onClick={()=>onSelect('global-prompts')}>全局提示词{profile.globalPrompts?.some(part=>part.content.length>0)&&<small>已设置</small>}</button>{PROMPT_CATALOG.map(prompt=><button key={prompt.id} className={selected!=='global-prompts'&&entry.id===prompt.id?'is-active':''} aria-pressed={selected!=='global-prompts'&&entry.id===prompt.id} onClick={()=>onSelect(prompt.id)}>{prompt.label}{profile.promptOverrides?.[prompt.id]!==undefined&&<small>已修改</small>}</button>)}</nav>
   {selected==='global-prompts'?<GlobalPromptEditor value={profile} onChange={globalConfig=>onChange({...profile,...globalConfig})} storyPrompts={storyPrompts} writerEditor={writerEditor} onFork={beginFork} onSwitch={family=>{const set=writingSet(family),next=set?selectWritingPreset(profile,storyPrompts,set.preset.id,set.modelFamily):switchWritingPreset(profile,storyPrompts,family);onChange(next.globalConfig);onStoryPromptsChange(next.storyPrompts);}} disabled={!ready}/>:entry.id==='story-writer'?writerEditor:<div>
    <label>{entry.label}提示词<textarea className="prompt-editor" aria-label={`${entry.label}提示词`} rows={18} maxLength={24000} spellCheck={false} value={text} onChange={e=>onChange({...profile,promptOverrides:{...profile.promptOverrides,[entry.id]:e.target.value}})}/></label>
    {inherits&&<p>{custom?'正在使用单独设置的提示词。':'当前沿用小说正文提示词。'}</p>}
    <div className="field-actions"><Button variant="secondary" onClick={()=>{const next={...profile.promptOverrides};delete next[entry.id];onChange({...profile,promptOverrides:next});}}>{inherits?'恢复沿用小说正文':'恢复默认提示词'}</Button><span className="muted">{text.length} / 24000 字</span></div>
   </div>}
  </div>
  <Modal open={!!fork} title="另存为自定义预设" onClose={()=>setFork(null)} actions={<>
   <Button variant="secondary" onClick={()=>setFork(null)}>取消</Button>
   <Button disabled={!presetName.trim()} onClick={createPreset}>创建并切换</Button>
  </>}>
   <p>复制当前适配版的条目和开关，并把新条目加入副本。</p>
   <label>新预设名称<input value={presetName} maxLength={80} onChange={event=>{setPresetName(event.target.value);setForkError('');}} onKeyDown={event=>{
    if(event.key==='Enter'&&!event.nativeEvent.isComposing&&presetName.trim()){event.preventDefault();createPreset();}
   }}/></label>
   {forkError&&<p role="alert">{forkError}</p>}
   <p>完成编辑后，点击「保存设置」保存到「我的预设」。</p>
  </Modal>
 </Panel>;
}
