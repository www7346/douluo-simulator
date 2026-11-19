import {useState,type ReactNode} from 'react';
import {AUTHOR_PROMPT_TASKS,toggleGlobalPrompt,type GlobalPrompt,type GlobalPromptConfiguration,type GlobalPromptFamily} from '../../runtime/model-global-prompts';
import {MODEL_TASKS} from '../../runtime/model-settings';
import {movePromptItem} from '../../shared/prompt-order';
import {ActionSection,Button} from '../components';
import PromptOrderList from './PromptOrderList';
import PromptSourceNote from './PromptSourceNote';
import {isPersonalWritingPresetId,WRITING_PRESETS,WRITING_MODEL_LABELS,writingSet,writingSetLabel,type WritingPresetId,type WritingPresetSet} from '../../runtime/writing-preset-catalog';
import {currentPersonalWriterPreset,writerPresetOwner,writerPromptParts} from '../../runtime/story-writer-prompts';
import type {StoryPromptConfig} from '../../runtime/story-prompts';
import type {WritingPresetAddition} from '../../runtime/prompt-presets';

export default function GlobalPromptEditor({value,onChange,onSwitch,onFork,storyPrompts,writerEditor,disabled=false}:{value:GlobalPromptConfiguration;onChange:(value:GlobalPromptConfiguration)=>void;onSwitch:(family:GlobalPromptFamily)=>void;onFork:(addition:WritingPresetAddition,onCreated:()=>void)=>void;storyPrompts:StoryPromptConfig;writerEditor:ReactNode;disabled?:boolean}){
 const parts=value.globalPrompts??[],[selected,setSelected]=useState(''),[error,setError]=useState('');
 const family=value.globalPromptPreset?.active??'custom';
 const savedSet=writingSet(family);
 const personal=currentPersonalWriterPreset(storyPrompts);
 const personalEntries=Object.entries(storyPrompts.personalWriterPresets??{});
 const [draftPreset,setDraftPreset]=useState<WritingPresetId|null>(null);
 const preset=draftPreset??(personal?family:savedSet?.preset.id??(family==='gemini'?'meow':family==='deepseek'?'dream':''));
 const manualFamily=draftPreset?'':(personal?writingSet(personal.source)?.modelFamily:savedSet?.modelFamily)??(family==='gemini'?'gemini':family==='deepseek'?'deepseek':'');
 const pending=draftPreset?writerPromptParts({...storyPrompts,writerPreset:draftPreset}).filter(part=>writerPresetOwner(part.id)===draftPreset):null;
 const changeParts=(globalPrompts:GlobalPrompt[])=>onChange({...value,globalPrompts});
 const part=parts.find(item=>item.id===selected);
 const edit=(patch:Partial<GlobalPrompt>)=>{if(part)changeParts(parts.map(item=>item.id===part.id?{...item,...patch}:item));};
 const apply=(next:GlobalPromptFamily)=>{try{onSwitch(next);setDraftPreset(null);setSelected('');setError('');}catch(e){setError((e as Error).message);}};
 const choose=(id:string)=>{
  if(isPersonalWritingPresetId(id))apply(id);
  else{setDraftPreset(id as WritingPresetId);setSelected('');setError('');}
 };
 const add=()=>{
  const row:GlobalPrompt={id:crypto.randomUUID(),name:'新全局提示词',content:'',enabled:true,position:'before'};
  if(savedSet)onFork({kind:'global',part:row},()=>setSelected(row.id));
  else{changeParts([...parts,row]);setSelected(row.id);}
 };
 const editor=part?<section className="writer-prompt-content" aria-label="编辑全局提示词">
   <PromptSourceNote source={part.source}/>
   <label>提示词内容<textarea aria-label="全局提示词内容" rows={12} maxLength={24000} spellCheck={false} value={part.content} onChange={e=>edit({content:e.target.value})}/></label>
   <span className="muted">{part.content.length} / 24000 字</span>
   <label>提示词名称<input aria-label="全局提示词名称" maxLength={80} value={part.name} onChange={e=>edit({name:e.target.value})}/></label>
   <label>适用用途<select value={part.tasks===undefined?'all':part.tasks.filter(task=>MODEL_TASKS.some(entry=>entry.id===task)).length===AUTHOR_PROMPT_TASKS.length&&AUTHOR_PROMPT_TASKS.every(task=>part.tasks!.includes(task))?'author':'selected'} onChange={e=>edit({tasks:e.target.value==='all'?undefined:e.target.value==='author'?[...AUTHOR_PROMPT_TASKS]:[]})}><option value="all">所有用途</option><option value="author">小说正文与重写</option><option value="selected">自选用途</option></select></label>
   {part.tasks!==undefined&&<ActionSection title={<>选择具体用途（{part.tasks.filter(task=>MODEL_TASKS.some(entry=>entry.id===task)).length} 项）</>}><div className="form-grid">{MODEL_TASKS.map(task=><label className="check-row" key={task.id}><input type="checkbox" checked={part.tasks!.includes(task.id)} onChange={e=>edit({tasks:e.target.checked?[...part.tasks!,task.id]:part.tasks!.filter(id=>id!==task.id)})}/>{task.label}</label>)}</div></ActionSection>}
   <div className="form-grid"><label>注入位置<select value={part.position??'before'} onChange={e=>edit({position:e.target.value as GlobalPrompt['position']})}><option value="before">前注入</option><option value="before-context">要求后、资料前</option><option value="after">后注入</option></select></label><label>消息角色<select value={part.role??'system'} onChange={e=>edit({role:e.target.value as GlobalPrompt['role']})}><option value="system">System · 系统</option><option value="user">User · 用户</option><option value="assistant">Assistant · 助手</option></select></label>
   <label>适用渠道<select value={part.channel??'any'} onChange={e=>edit({channel:e.target.value as GlobalPrompt['channel']})}><option value="any">所有渠道</option><option value="official">DeepSeek / Gemini 官方地址</option><option value="compatible">第三方兼容渠道</option></select></label><label>适用模型（每行一个，留空为全部）<textarea aria-label="适用模型" rows={3} value={(part.models??[]).join('\n')} onChange={e=>edit({models:e.target.value.split('\n')})} onBlur={()=>edit({models:part.models?.map(s=>s.trim()).filter(Boolean)})}/></label></div>
   <label className="check-row"><input type="checkbox" checked={!!part.analysis} onChange={e=>edit({analysis:e.target.checked?{start:'<think>',end:'</think>'}:undefined})}/>分离正文前的分析区</label>
   {part.analysis&&<div className="form-grid"><label>分析开始标记<input maxLength={72} value={part.analysis.start} onChange={e=>edit({analysis:{...part.analysis!,start:e.target.value}})}/></label><label>分析结束标记<input maxLength={72} value={part.analysis.end} onChange={e=>edit({analysis:{...part.analysis!,end:e.target.value}})}/></label></div>}
  </section>:null;
 return <fieldset className="writer-prompt-editor" disabled={disabled}>
  <h3>全局提示词</h3><p>发送顺序：前注入 → 本用途要求 → 资料前注入 → 任务资料 → 后注入。各位置内按列表排序，仅发送符合用途、模型与渠道的条目。</p>
  <div className="form-grid" role="group" aria-label="预设与适配模型">
   <label>选择预设<select aria-label="选择写作预设" value={preset} onChange={e=>choose(e.target.value)}>
    <option value="" disabled>请选择预设</option>
    <optgroup label="内置预设">{WRITING_PRESETS.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</optgroup>
    {personalEntries.length>0&&<optgroup label="我的预设">{personalEntries.map(([id,item])=>item&&<option key={id} value={id}>{item.name}</option>)}</optgroup>}
   </select></label>
   <label>适配模型<select aria-label="预设适配模型" value={manualFamily} disabled={!preset||(!draftPreset&&!!personal)} onChange={e=>apply(`${preset}:${e.target.value}` as WritingPresetSet)}>
    <option value="" disabled>请选择适配模型</option>{Object.entries(WRITING_MODEL_LABELS).map(([id,label])=><option key={id} value={id}>{label}</option>)}
   </select></label>
  </div>
  <p>先选预设查看正文条目，再选适配模型应用对应开关。</p>
  <Button variant="secondary" aria-pressed={family==='custom'} onClick={()=>apply('custom')}>自定义套组</Button>
  <p role="status">{`当前套组：${personal?.name??writingSetLabel(family)} · ${parts.length} 条`}</p>
  {pending&&<section aria-label="待应用的正文条目"><h4>{WRITING_PRESETS.find(item=>item.id===preset)?.label} · 正文条目</h4><ul>{pending.map(row=><li key={row.id}>{row.name}</li>)}</ul></section>}
  <p className="muted">各预设保留正文文本和顺序，各适配模型分别记住套组条目的开关。点击“保存设置”后生效。</p>
  {error&&<p role="alert">{error}</p>}
  {pending?<p>选择适配模型后即可调整该套组的开关。</p>:<>
  {(savedSet||personal)&&writerEditor}
  {!!value.replyTools?.length&&<p>已启用预设工具：{value.replyTools.map(t=>t.name).join('、')}。</p>}
  <PromptOrderList items={parts.map(p=>({...p,detail:(p.position==='after'?'后注入':p.position==='before-context'?'要求后、资料前':'前注入')+' · '+(p.tasks===undefined?'所有用途':p.tasks.filter(task=>MODEL_TASKS.some(entry=>entry.id===task)).length===AUTHOR_PROMPT_TASKS.length&&AUTHOR_PROMPT_TASKS.every(task=>p.tasks!.includes(task))?'正文与重写':p.tasks.filter(task=>MODEL_TASKS.some(entry=>entry.id===task)).length+' 项用途')+' · '+(p.models?.join('、')||'所有模型')+' · '+(p.channel==='official'?'官方':p.channel==='compatible'?'兼容渠道':'所有渠道')}))} selected={part?.id} expandedContent={editor} label="全局提示词顺序" onSelect={id=>setSelected(current=>current===id?'':id)} onMove={(from,to)=>changeParts(movePromptItem(parts,from,to))} onToggle={(id,enabled)=>changeParts(toggleGlobalPrompt(parts,id,enabled))} canRemove={()=>true} onRemove={id=>changeParts(parts.filter(item=>item.id!==id))}/>
  <Button variant="secondary" disabled={parts.length>=100} onClick={add}>新增全局提示词</Button>
  {!parts.length&&<p>还没有全局提示词，点击新增即可开始。</p>}
  </>}
 </fieldset>;
}
