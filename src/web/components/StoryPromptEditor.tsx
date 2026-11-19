import {useMemo,useState} from 'react';
import {ActionSection,Button} from '../components';
import {STORY_PROMPT_SLOTS,inspectStoryPromptDependencies,compileStoryPrompt,importStoryPromptModules,parseTavernPromptCatalog,type PromptCatalog,type StoryPromptConfig,type StoryPromptModule,type StoryPromptTarget,type StoryPromptTrigger} from '../../runtime/story-prompts';
const slotNames:Record<string,string>={main:'主持要求',worldInfoBefore:'前置世界资料',personaDescription:'玩家资料',charDescription:'人物描述',charPersonality:'人物性格',scenario:'当前场景',worldInfoAfter:'后置世界资料',dialogueExamples:'对话示例',chatHistory:'聊天历史'};
const slotLabel=(id:string)=>slotNames[id]??'其他资料';

/** Imported documents remain editable data; selecting a file never activates its modules. */
export default function StoryPromptEditor({value,onChange,disabled=false}:{value:StoryPromptConfig;onChange:(value:StoryPromptConfig)=>void;disabled?:boolean}){
 const [catalog,setCatalog]=useState<PromptCatalog|null>(null),[group,setGroup]=useState(''),[selected,setSelected]=useState<string[]>([]),[error,setError]=useState('');
 const [preview,setPreview]=useState(''),[variableName,setVariableName]=useState(''),[variableValue,setVariableValue]=useState('');
 const [globalName,setGlobalName]=useState(''),[globalValue,setGlobalValue]=useState('');
 const [previewTarget,setPreviewTarget]=useState<StoryPromptTarget>('writer'),[previewTrigger,setPreviewTrigger]=useState<StoryPromptTrigger>('normal');
 const targets=[['writer','故事正文'],['private','角色私聊'],['party','队伍群聊'],['host','主持裁定']] as const;
 const triggers=[['normal','正常生成'],['regenerate','重新生成']] as const;
 const dependencies=useMemo(()=>catalog&&group?inspectStoryPromptDependencies(catalog,group,selected):null,[catalog,group,selected]);
 const parameterNames=[...new Set(value.modules.flatMap(module=>[...module.content.matchAll(/<\|([^<>]*?)\|>/g)].map(match=>match[1])))];
 const change=(next:StoryPromptConfig)=>{setPreview('');onChange(next);};
 const update=(id:string,patch:Partial<StoryPromptModule>)=>change({...value,modules:value.modules.map(m=>m.id===id?{...m,...patch}:m)});
 const move=(index:number,direction:number)=>{const layout=[...value.layout];[layout[index],layout[index+direction]]=[layout[index+direction],layout[index]];change({...value,layout});};
 const load=async(file:File)=>{setError('');setCatalog(null);setSelected([]);try{if(file.size>4_000_000)throw Error('预设文件超过读取上限');const parsed=parseTavernPromptCatalog(await file.text());setCatalog(parsed);setGroup(parsed.groups[0]?.id??'');}catch(e){setError((e as Error).message);}};
 const importSelected=()=>{try{const imported=importStoryPromptModules(catalog!,group,selected);change({...imported,style:value.style,nsfw:value.nsfw,writerPrompts:value.writerPrompts,writerPreset:value.writerPreset,writerPresetSwitches:value.writerPresetSwitches,personalWriterPresets:value.personalWriterPresets,writerTargetChars:value.writerTargetChars});setError('');setCatalog(null);}catch(e){setError((e as Error).message);}};
 return <ActionSection title={<>提示词模块与消息结构</>} className="story-prompt-editor"><fieldset disabled={disabled}>
  <label>读取酒馆预设文件<input type="file" accept=".json,application/json" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void load(file);}}/></label>
  {catalog&&<div>
   <label>源配置组<select value={group} onChange={e=>{setGroup(e.target.value);setSelected([]);}}>{catalog.groups.map(g=><option key={g.id} value={g.id}>{g.id}（{g.order.length}项）</option>)}</select></label>
   <p>勾选需要导入的模块。应用后替换当前模块及布局，清空原来的初始变量、全局文本值和外部参数，保留文风与 NSFW 输入；源配置中关闭的模块仍保持关闭。</p>
   <div className="story-prompt-editor__catalog">{catalog.groups.find(g=>g.id===group)?.order.map(entry=>{const module=catalog.prompts.find(m=>m.id===entry.id);return module&&!module.marker?<label key={entry.id}><input type="checkbox" checked={selected.includes(entry.id)} onChange={e=>setSelected(e.target.checked?[...selected,entry.id]:selected.filter(id=>id!==entry.id))}/>{module.name} · {module.role} · {entry.enabled?'源配置开启':'源配置关闭'}</label>:null;})}</div>
   {selected.length>0&&dependencies&&<ActionSection title={<>所选模块的变量依赖</>} defaultOpen>
    <p>下方列出可能为变量赋值的模块。选择需要的条目，应用后可预览变量和触发顺序。</p>
    {dependencies.dependencies.length===0&&<p>未发现需要填写的固定名称变量。</p>}
    <ul>{dependencies.dependencies.map(item=><li key={`${item.moduleId}:${item.scope??'local'}:${item.variable}`}>
     <strong>{item.moduleName}：{item.variable}{item.scope==='global'?'（全局文本值）':''}</strong>{item.optional?'（允许不存在：存在性检查或追加时初始化）':''}
     {item.scope==='global'?<p>应用后在全局文本值中填写；同名局部变量不能代替此值。</p>:item.candidates.length===0?<p>未找到赋值模块，请在应用后填写初始变量并预览。</p>:<ul>{item.candidates.map(candidate=><li key={candidate.id}>
      {candidate.name} · {candidate.selected?'已选择':'未选择'} · {candidate.enabled?'源配置开启':'源配置关闭'} · {candidate.position==='before'?'排在读取模块前':candidate.position==='same'?'位于同一模块，需检查内部顺序':'排在读取模块后，需调整顺序'}
      {!candidate.selected&&<Button variant="ghost" onClick={()=>setSelected([...selected,candidate.id])}>选择候选模块 {candidate.name}</Button>}
     </li>)}</ul>}
    </li>)}</ul>
    {dependencies.notes.map((note,index)=><p key={`${note.moduleId}:${index}`}>{catalog.prompts.find(p=>p.id===note.moduleId)?.name??note.moduleId}：{note.message}</p>)}
   </ActionSection>}
   <Button disabled={!selected.length} onClick={importSelected}>应用所选模块与源布局</Button><Button variant="ghost" onClick={()=>setCatalog(null)}>取消导入</Button>
  </div>}
  {error&&<p role="alert">{error}</p>}
  <ActionSection title={<>初始变量与外部依赖</>}>
   <p>填写模块所需的初始变量，例如开关值 false。后续模块可重新赋值；变量值按文字读取。</p>
   {Object.entries(value.initialVariables??{}).map(([key,text])=><div key={key}>
    <label>{key}<textarea rows={2} value={text} onChange={e=>change({...value,initialVariables:{...value.initialVariables,[key]:e.target.value}})}/></label>
    <Button variant="ghost" onClick={()=>{const initialVariables={...value.initialVariables};delete initialVariables[key];change({...value,initialVariables});}}>删除变量 {key}</Button>
   </div>)}
   <label>新增变量名<input value={variableName} maxLength={160} onChange={e=>setVariableName(e.target.value)}/></label>
   <label>初始值<textarea rows={2} value={variableValue} onChange={e=>setVariableValue(e.target.value)}/></label>
   <Button variant="secondary" disabled={!variableName.trim()} onClick={()=>{const name=variableName.trim();if(Object.hasOwn(value.initialVariables??{},name)){setError('该变量已存在，请在原位置编辑');return;}if(Object.keys(value.initialVariables??{}).length>=100){setError('初始变量最多填写100项');return;}change({...value,initialVariables:{...value.initialVariables,[name]:variableValue}});setVariableName('');setVariableValue('');setError('');}}>添加变量</Button>
  </ActionSection>
  <ActionSection title={<>全局文本值</>}>
   <p>供 getglobalvar 读取的文本值，与提示词配置一起保存，并与局部变量分开。值中的宏按文字保留。</p>
   {Object.entries(value.globalVariables??{}).map(([key,text])=><div key={key}>
    <label>全局 {key}<textarea rows={2} value={text} onChange={e=>change({...value,globalVariables:{...value.globalVariables,[key]:e.target.value}})}/></label>
    <Button variant="ghost" onClick={()=>{const globalVariables={...value.globalVariables};delete globalVariables[key];change({...value,globalVariables});}}>删除全局值 {key}</Button>
   </div>)}
   <label>新增全局变量名<input value={globalName} maxLength={160} onChange={e=>setGlobalName(e.target.value)}/></label>
   <label>全局文本内容<textarea rows={2} value={globalValue} onChange={e=>setGlobalValue(e.target.value)}/></label>
   <Button variant="secondary" disabled={!globalName.trim()} onClick={()=>{const name=globalName.trim();if(Object.hasOwn(value.globalVariables??{},name)){setError('该全局值已存在，请在原位置编辑');return;}if(Object.keys(value.globalVariables??{}).length>=100){setError('全局文本值最多填写100项');return;}change({...value,globalVariables:{...value.globalVariables,[name]:globalValue}});setGlobalName('');setGlobalValue('');setError('');}}>添加全局值</Button>
  </ActionSection>
  {parameterNames.length>0&&<ActionSection title={<>外部文本参数与标记</>}>
   <p>为所选模块用到的标记填写文本值，或选择原样保留。缺失参数会在预览时提示；填写的值按文字发送。</p>
   {parameterNames.map(name=>{const token=`<|${name}|>`,defined=Object.hasOwn(value.externalParameters??{},name),text=value.externalParameters?.[name]??'',mode=!defined?'missing':text===token?'literal':'value';return <div key={name}>
    <label>参数 {name}<select value={mode} onChange={e=>{const externalParameters={...value.externalParameters};if(e.target.value==='missing')delete externalParameters[name];else externalParameters[name]=e.target.value==='literal'?token:'';change({...value,externalParameters});}}><option value="missing">未映射</option><option value="value">填写文本值（可为空）</option><option value="literal">原样保留标记</option></select></label>
    {mode==='value'&&<label>{name} 的文本值<textarea rows={2} value={text} onChange={e=>change({...value,externalParameters:{...value.externalParameters,[name]:e.target.value}})}/></label>}
   </div>;})}
  </ActionSection>}
  <ol className="story-prompt-editor__layout">{value.layout.map((part,index)=>{
   const module=part.kind==='module'?value.modules.find(m=>m.id===part.id):undefined;
   return <li key={`${part.kind}:${part.id}`}>
    <span>{module?.name??`游戏资料：${slotLabel(part.id)}`}</span>
    <Button variant="ghost" disabled={index===0} onClick={()=>move(index,-1)} aria-label={`上移 ${module?.name??part.id}`}>↑</Button><Button variant="ghost" disabled={index===value.layout.length-1} onClick={()=>move(index,1)} aria-label={`下移 ${module?.name??part.id}`}>↓</Button>
    {part.kind==='slot'?<label><input type="checkbox" checked={part.enabled} onChange={e=>change({...value,layout:value.layout.map((p,i)=>i===index?{...part,enabled:e.target.checked}:p)})}/>启用</label>:module&&<ActionSection title={<>编辑模块与查看原文</>}>
     <label><input type="checkbox" checked={module.enabled} onChange={e=>update(module.id,{enabled:e.target.checked})}/>启用模块</label>
     <label>消息角色<select value={module.role} onChange={e=>update(module.id,{role:e.target.value as StoryPromptModule['role']})}>{['system','user','assistant'].map(role=><option key={role}>{role}</option>)}</select></label>
     <label>位置<select value={module.position} onChange={e=>update(module.id,{position:Number(e.target.value)})}><option value={0}>按布局顺序</option><option value={1}>插入聊天历史</option>{![0,1].includes(module.position)&&<option value={module.position}>未支持的位置 {module.position}</option>}</select></label>
     <label>历史深度<input type="number" min={0} step={1} value={module.depth} onChange={e=>update(module.id,{depth:Number(e.target.value)})}/></label>
     <label>同位置排序<input type="number" step={1} value={module.order} onChange={e=>update(module.id,{order:Number(e.target.value)})}/></label>
     <fieldset><legend>作用于哪些调用</legend>{targets.map(([target,label])=><label key={target}><input type="checkbox" checked={module.targets.includes(target)} onChange={e=>update(module.id,{targets:e.target.checked?[...module.targets,target]:module.targets.filter(t=>t!==target)})}/>{label}</label>)}<p className="muted">勾选需要使用此模块的用途。</p></fieldset>
     <fieldset><legend>触发条件</legend>
      <label><input type="checkbox" checked={module.triggers.length===0} onChange={e=>update(module.id,{triggers:e.target.checked?[]:['normal']})}/>每次生成</label>
      {triggers.map(([trigger,label])=><label key={trigger}><input type="checkbox" disabled={module.triggers.length===0} checked={module.triggers.includes(trigger)} onChange={e=>update(module.id,{triggers:e.target.checked?[...module.triggers,trigger]:module.triggers.filter(t=>t!==trigger)})}/>{label}</label>)}
      {module.triggers.filter(t=>!triggers.some(([known])=>known===t)).map(trigger=><p key={trigger}>{trigger==='continue'?'已停用的触发条件':'尚未支持的源触发条件'}：{trigger} <Button variant="ghost" onClick={()=>update(module.id,{triggers:module.triggers.filter(t=>t!==trigger)})}>移除条件 {trigger}</Button></p>)}
      <p className="muted">条件全部清空代表每次生成；要停止发送，请关闭模块。“重新生成”用于重写本段；新的行动请在聊天框输入。</p>
     </fieldset>
     <label>模块文本<textarea rows={6} value={module.content} onChange={e=>update(module.id,{content:e.target.value})}/></label>
     <details><summary>导入原文与原始结构</summary><pre>{JSON.stringify(module.original,null,2)}</pre></details>
    </ActionSection>}
   </li>;
  })}</ol>
  {STORY_PROMPT_SLOTS.filter(id=>!value.layout.some(p=>p.kind==='slot'&&p.id===id)).map(id=><Button key={id} variant="ghost" onClick={()=>change({...value,layout:[...value.layout,{kind:'slot',id,enabled:true}]})}>添加{slotLabel(id)}</Button>)}
  <label>助手预填充<select value={value.prefillId??''} onChange={e=>{const next={...value};if(e.target.value)next.prefillId=e.target.value;else delete next.prefillId;change(next);}}><option value="">不使用</option>{value.modules.filter(m=>m.role==='assistant').map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
  <label>模型支持的预填充方式<select value={value.prefillMode??''} onChange={e=>{const next={...value};if(e.target.value)next.prefillMode=e.target.value as StoryPromptConfig['prefillMode'];else delete next.prefillMode;change(next);}}><option value="">不启用兼容预填充</option><option value="assistant-message">Anthropic 原生 Assistant 续写</option><option value="deepseek-prefix">DeepSeek prefix</option><option value="compatible-assistant">兼容接口末尾 Assistant（需模型支持）</option></select></label>
  <label>预览调用<select value={previewTarget} onChange={e=>{setPreviewTarget(e.target.value as StoryPromptTarget);setPreview('');}}>{targets.map(([target,label])=><option key={target} value={target}>{label}</option>)}</select></label>
  <label>预览触发条件<select value={previewTrigger} onChange={e=>{setPreviewTrigger(e.target.value as StoryPromptTrigger);setPreview('');}}>{triggers.map(([trigger,label])=><option key={trigger} value={trigger}>{label}</option>)}</select></label>
  <Button variant="secondary" onClick={()=>{try{const result=compileStoryPrompt(value,{target:previewTarget,trigger:previewTrigger,user:'玩家',character:'主持人',slots:{main:[{role:'system',content:'【示例：主持要求与当前状态】'}],chatHistory:[{role:'user',content:'【示例：上一回合行动】'},{role:'assistant',content:'【示例：上一回合故事】'},{role:'user',content:'【示例：本次行动】'}]}});setPreview(JSON.stringify(result,null,2));setError('');}catch(e){setPreview('');setError((e as Error).message);}}}>检查结构并预览编排</Button>
  <p className="muted">使用示例历史预览消息顺序，无需调用模型。修改后点击页面上方“保存设置”。</p>
  {preview&&<pre aria-label="示例消息编排">{preview}</pre>}
 </fieldset></ActionSection>;
}
