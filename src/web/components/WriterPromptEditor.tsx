import {useState} from 'react';
import type {ModelProfile} from '../../runtime/model-gateway';
import {modelPromptText} from '../../runtime/model-prompt-templates';
import type {StoryPromptConfig,PersonalWriterPreset} from '../../runtime/story-prompts';
import {customWriterPromptCount,currentPersonalWriterPreset,isBundledWriterModule,MAX_CUSTOM_WRITER_PROMPTS,moveWriterPrompt,writerPartInCurrentPreset,writerPartText,writerPromptParts,writerPromptTargets,toggleWriterPrompt,WRITER_CATEGORIES,WRITER_PROMPT_TARGETS,type WriterPromptPart,type WriterPromptTarget} from '../../runtime/story-writer-prompts';
import {addRecommendedWriterPresets,type WritingPresetAddition} from '../../runtime/prompt-presets';
import {Button} from '../components';
import PromptOrderList from './PromptOrderList';
import PromptSourceNote from './PromptSourceNote';

export default function WriterPromptEditor({profile,onProfileChange,value,onChange,onFork,disabled=false}:{profile:Omit<ModelProfile,'apiKey'>;onProfileChange:(profile:Omit<ModelProfile,'apiKey'>)=>void;value:StoryPromptConfig;onChange:(value:StoryPromptConfig)=>void;onFork:(addition:WritingPresetAddition,onCreated:()=>void)=>void;disabled?:boolean}){
 const parts=writerPromptParts(value),[selected,setSelected]=useState(''),[filter,setFilter]=useState('all'),[error,setError]=useState('');
 const isCustom=!value.writerPreset||value.writerPreset==='custom';
 const personal=currentPersonalWriterPreset(value);
 const builtIn=!isCustom&&!personal;
 const change=(patch:Partial<Pick<PersonalWriterPreset,'writerPrompts'|'style'|'nsfw'>>)=>{
  if(personal)onChange({...value,personalWriterPresets:{...value.personalWriterPresets,[value.writerPreset!]:{...personal,...patch}}});
  else onChange({...value,...patch});
 };
 const category=(p:WriterPromptPart)=>p.category??(p.kind==='style'?'style':p.kind==='nsfw'?'nsfw':'other');
 const visible=parts.filter(part=>writerPartInCurrentPreset(value,part)&&(filter==='all'||(filter==='nsfw')===(category(part)==='nsfw')));
 const part=visible.find(p=>p.id===selected);
 const text=part?(part.kind==='instruction'?modelPromptText(profile,'story-writer'):writerPartText(value,part)):'';
 const edit=(patch:Partial<WriterPromptPart>)=>{if(part)change({writerPrompts:parts.map(p=>p.id===part.id?{...p,...patch}:p)});};
 const updateText=(content:string)=>{
  if(!part)return;
  if(part.kind==='instruction')onProfileChange({...profile,promptOverrides:{...profile.promptOverrides,'story-writer':content}});
  else if(part.kind==='text')edit({content});
  else change({[part.kind]:content});
 };
 const add=()=>{
  const row:WriterPromptPart={id:crypto.randomUUID(),name:filter==='nsfw'?'新NSFW提示词':'新提示词',kind:'text',category:filter==='nsfw'?'nsfw':'other',enabled:true,content:''};
  if(builtIn)onFork({kind:'writer',part:row},()=>setSelected(row.id));
  else{change({writerPrompts:[...parts,row]});setSelected(row.id);}
 };
 const load=()=>{try{onChange(addRecommendedWriterPresets(value,profile.globalPromptPreset?.active??'custom'));setError('');}catch(e){setError((e as Error).message);}};
 const editor=part&&<section className="writer-prompt-content" aria-label="编辑所选提示词">
   {part.kind==='instruction'?<h4>{part.name}</h4>:<label>提示词名称<input aria-label="提示词名称" maxLength={80} value={part.name} onChange={e=>edit({name:e.target.value})}/></label>}
   {part.kind==='text'&&<div className="form-grid"><label>分类<select value={category(part)} onChange={e=>edit({category:e.target.value as WriterPromptPart['category']})}>{Object.entries(WRITER_CATEGORIES).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><label>互斥组（留空可叠加）<input maxLength={80} value={part.exclusiveGroup??''} onChange={e=>edit({exclusiveGroup:e.target.value})}/></label></div>}
   {part.kind!=='instruction'&&<div role="group" aria-label="提示词适用范围"><p>适用于（至少选一项）</p><div className="form-grid">{(Object.entries(WRITER_PROMPT_TARGETS) as [WriterPromptTarget,string][]).map(([target,label])=>{const targets=writerPromptTargets(part),checked=targets.includes(target);return <label className="check-row" key={target}><input type="checkbox" checked={checked} disabled={checked&&targets.length===1} onChange={e=>edit({targets:e.target.checked?[...targets,target]:targets.filter(id=>id!==target)})}/>{label}</label>;})}</div></div>}
   <PromptSourceNote source={part.source}/>
   <label>{part.name}内容<textarea aria-label={part.kind==='instruction'?'小说正文提示词':part.name+'提示词'} rows={12} maxLength={24000} spellCheck={false} value={text} readOnly={!!personal&&part.kind==='instruction'} onChange={e=>updateText(e.target.value)}/></label>
   <div className="field-actions">{part.kind==='instruction'&&(personal?<span className="muted">此基础指令由所有套组共用。</span>:<Button variant="secondary" onClick={()=>{const promptOverrides={...profile.promptOverrides};delete promptOverrides['story-writer'];onProfileChange({...profile,promptOverrides});}}>恢复默认提示词</Button>)}<span className="muted">{text.length} / 24000 字</span></div>
  </section>;
 return <fieldset className="writer-prompt-editor" disabled={disabled}>
  <h3>小说正文提示词</h3><p>勾选启用，拖动 ⋮⋮ 排序。文风和NSFW条目默认也用于私聊、群聊，可逐条修改适用范围；视角、节奏、行动选项等默认只用于正文。粘贴文风时，将分类选为“文风”。切换同组条目会关闭同组其他条目。</p>
  {isCustom&&<div className="field-actions"><Button variant="secondary" onClick={load}>载入通用备选</Button><span>补充自定义套组的备选条目。</span></div>}
  <p>NSFW 条目可以同时开启多条，勾几个就发几个。</p>
  <div className="prompt-filters" role="group" aria-label="正文提示词分类">{[['all','全部与总顺序'],['writing','正文写作'],['nsfw','NSFW']].map(([id,label])=><Button key={id} variant={filter===id?'primary':'ghost'} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{label}</Button>)}</div>
  {error&&<p role="alert">{error}</p>}
  <PromptOrderList items={visible.map(p=>({...p,detail:p.kind==='instruction'?'正文基础指令':WRITER_CATEGORIES[category(p)]+' · '+writerPromptTargets(p).map(target=>WRITER_PROMPT_TARGETS[target]).join('、')}))} selected={part?.id} expandedContent={editor} label="小说正文提示词顺序" onSelect={id=>setSelected(current=>current===id?'':id)} onMove={(id,target)=>change({writerPrompts:moveWriterPrompt(parts,id,target)})} onToggle={(id,enabled)=>change({writerPrompts:toggleWriterPrompt(parts,id,enabled,value)})} canRemove={id=>parts.find(item=>item.id===id)?.kind!=='instruction'&&(!!personal||!isBundledWriterModule(id))} onRemove={id=>change({writerPrompts:parts.filter(item=>item.id!==id)})}/>
  <Button variant="secondary" disabled={!builtIn&&customWriterPromptCount(parts)>=MAX_CUSTOM_WRITER_PROMPTS} onClick={add}>新增{filter==='nsfw'?'NSFW':''}提示词</Button>

 </fieldset>;
}
