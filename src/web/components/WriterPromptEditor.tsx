import {useState} from 'react';
import type {ModelProfile} from '../../runtime/model-gateway';
import {modelPromptText} from '../../runtime/model-prompt-templates';
import type {StoryPromptConfig} from '../../runtime/story-prompts';
import {moveWriterPrompt,writerPromptParts,toggleWriterPrompt,WRITER_CATEGORIES,type WriterPromptPart} from '../../runtime/story-writer-prompts';
import {addRecommendedWriterPresets} from '../../runtime/prompt-presets';
import {Button} from '../components';
import PromptOrderList from './PromptOrderList';
import PromptSourceNote from './PromptSourceNote';

export default function WriterPromptEditor({profile,onProfileChange,value,onChange,disabled=false}:{profile:Omit<ModelProfile,'apiKey'>;onProfileChange:(profile:Omit<ModelProfile,'apiKey'>)=>void;value:StoryPromptConfig;onChange:(value:StoryPromptConfig)=>void;disabled?:boolean}){
 const parts=writerPromptParts(value),[selected,setSelected]=useState(''),[filter,setFilter]=useState('all'),[error,setError]=useState('');
 const category=(p:WriterPromptPart)=>p.category??(p.kind==='style'?'style':p.kind==='nsfw'?'nsfw':'other');
 const visible=parts.filter(part=>filter==='all'||(filter==='nsfw')===(category(part)==='nsfw'));
 const part=visible.find(p=>p.id===selected);
 const text=part?(part.kind==='instruction'?modelPromptText(profile,'story-writer'):part.kind==='text'?part.content!:value[part.kind]):'';
 const edit=(patch:Partial<WriterPromptPart>)=>{if(part)onChange({...value,writerPrompts:parts.map(p=>p.id===part.id?{...p,...patch}:p)});};
 const updateText=(content:string)=>{
  if(!part)return;
  if(part.kind==='instruction')onProfileChange({...profile,promptOverrides:{...profile.promptOverrides,'story-writer':content}});
  else if(part.kind==='text')edit({content});
  else onChange({...value,[part.kind]:content});
 };
 const load=()=>{try{onChange(addRecommendedWriterPresets(value,profile.globalPromptPreset?.active??'custom'));setError('');}catch(e){setError((e as Error).message);}};
 const editor=part&&<section className="writer-prompt-content" aria-label="编辑所选提示词">
   {part.kind==='instruction'?<h4>{part.name}</h4>:<label>提示词名称<input aria-label="提示词名称" maxLength={80} value={part.name} onChange={e=>edit({name:e.target.value})}/></label>}
   {part.kind==='text'&&<div className="form-grid"><label>分类<select value={category(part)} onChange={e=>edit({category:e.target.value as WriterPromptPart['category']})}>{Object.entries(WRITER_CATEGORIES).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><label>互斥组（留空可叠加）<input maxLength={80} value={part.exclusiveGroup??''} onChange={e=>edit({exclusiveGroup:e.target.value})}/></label></div>}
   <PromptSourceNote source={part.source}/>
   <label>{part.name}内容<textarea aria-label={part.kind==='instruction'?'小说正文提示词':part.name+'提示词'} rows={12} maxLength={24000} spellCheck={false} value={text} onChange={e=>updateText(e.target.value)}/></label>
   <div className="field-actions">{part.kind==='instruction'&&<Button variant="secondary" onClick={()=>{const promptOverrides={...profile.promptOverrides};delete promptOverrides['story-writer'];onProfileChange({...profile,promptOverrides});}}>恢复默认提示词</Button>}<span className="muted">{text.length} / 24000 字</span></div>
  </section>;
 return <fieldset className="writer-prompt-editor" disabled={disabled}>
  <h3>小说正文提示词</h3><p>勾选启用，拖动 ⋮⋮ 排序。切换同组文风、人称、节奏或行动选项时，会关闭同组其他条目。</p>
  <div className="field-actions"><Button variant="secondary" onClick={load}>载入推荐组合与备选</Button><span>已有内容和修改会保留；NSFW组合默认开启一条。</span></div>
  <div className="prompt-filters" role="group" aria-label="正文提示词分类">{[['all','全部与总顺序'],['writing','正文写作'],['nsfw','NSFW']].map(([id,label])=><Button key={id} variant={filter===id?'primary':'ghost'} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{label}</Button>)}</div>
  {error&&<p role="alert">{error}</p>}
  <PromptOrderList items={visible.map(p=>({...p,detail:p.kind==='instruction'?'基础指令':WRITER_CATEGORIES[category(p)]}))} selected={part?.id} expandedContent={editor} label="小说正文提示词顺序" onSelect={id=>setSelected(current=>current===id?'':id)} onMove={(id,target)=>onChange({...value,writerPrompts:moveWriterPrompt(parts,id,target)})} onToggle={(id,enabled)=>onChange({...value,writerPrompts:toggleWriterPrompt(parts,id,enabled)})} canRemove={id=>parts.find(item=>item.id===id)?.kind!=='instruction'} onRemove={id=>onChange({...value,writerPrompts:parts.filter(item=>item.id!==id)})}/>
  <Button variant="secondary" disabled={parts.length>=100} onClick={()=>{const id=crypto.randomUUID();onChange({...value,writerPrompts:[...parts,{id,name:filter==='nsfw'?'新NSFW提示词':'新提示词',kind:'text',category:filter==='nsfw'?'nsfw':'other',enabled:true,content:''}]});setSelected(id);}}>新增{filter==='nsfw'?'NSFW':''}提示词</Button>

 </fieldset>;
}
