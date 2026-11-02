import {useState} from 'react';
import {compileStoryPrompt,conversationPromptConfig,type StoryPromptConfig} from '../../runtime/story-prompts';
import {writerPromptMessages,writerPromptParts} from '../../runtime/story-writer-prompts';
import {promptMessage} from '../../runtime/model-prompt-templates';
import {previewModelPrompt} from '../../runtime/model-prompt-check';
import type {ModelProfile} from '../../runtime/model-gateway';
import sourceOrder from '../../shared/writing-source-order.json';
import {Button} from '../components';

const purposes={'story-writer':'正文','story-rewrite':'重写','private-chat':'当面或远程私聊','party-chat':'队伍群聊'} as const;
type Purpose=keyof typeof purposes;
function inspect(profile:Omit<ModelProfile,'apiKey'>,config:StoryPromptConfig,task:Purpose){
 const story=task==='story-writer'||task==='story-rewrite';
 const main=story?writerPromptMessages(config,promptMessage(task)):[promptMessage(task)];
 const compiled=compileStoryPrompt(story?config:conversationPromptConfig(config),{target:story?'writer':task==='private-chat'?'private':'party',trigger:task==='story-rewrite'?'regenerate':'normal',user:'旅人',character:'同行者',slots:{main,chatHistory:[{role:'user',content:'院子里的钟响了。'}]}});
 if(compiled.prefill&&!config.prefillMode)throw Error('请先为预填充选择模型支持的方式');
 const preview=previewModelPrompt(profile,compiled.messages,{task,promptStructure:{strict:true,...(config.prefillMode?{prefillMode:config.prefillMode}:{}),...(compiled.prefill&&config.prefillMode?{prefill:{content:compiled.prefill,mode:config.prefillMode}}:{})}});
 const body=preview.body as any;
 const wire:any[]=body.messages??body.input??body.contents??[];
 const parts=[...(typeof body.system==='string'||Array.isArray(body.system)?[{role:'system',content:body.system}]:[]),...(typeof body.instructions==='string'?[{role:'system',content:body.instructions}]:[]),...(body.systemInstruction?[{role:'system',content:body.systemInstruction}]:[]),...wire].map((m:any)=>({role:m.role??m.type??'message',content:m.content??m.parts??m}));
 const source=profile.globalPromptPreset?.active?.split(':')[0] as keyof typeof sourceOrder;
 const rows=(sourceOrder[source]??[]).map(row=>{
  const entry=(profile.globalPrompts??[]).find(p=>p.id===row.id)??writerPromptParts(config).find(p=>p.id===row.id);
  const text=entry?.content,at=text?parts.findIndex(p=>typeof p.content==='string'?p.content.includes(text):JSON.stringify(p.content).includes(JSON.stringify(text).slice(1,-1))):-1;
  const status=at>=0?'第 '+(at+1)+' 条 · '+parts[at].role:!row.id?(row.role==='marker'?'酒馆占位栏，游戏使用本轮资料':'本套适配未收录'):!entry||entry.enabled===false?'当前未启用':!story?'本次交谈未使用此条目':'已转换或未出现在本次请求';
  return {...row,status};
 });
 return {rows,roles:parts.map(p=>p.role),protocol:preview.protocol,tools:(body.tools??[]).flatMap((t:any)=>(t.functionDeclarations??t.function_declarations??[t.function??t]).map((f:any)=>f.name)).filter(Boolean),prefill:!!compiled.prefill};
}
export default function PresetWirePreview({profile,config}:{profile:Omit<ModelProfile,'apiKey'>;config:StoryPromptConfig}){
 const [task,setTask]=useState<Purpose>('story-writer'),[open,setOpen]=useState(false);
 let report:ReturnType<typeof inspect>|undefined,error='';
 if(open)try{report=inspect(profile,config,task);}catch(e){error=(e as Error).message;}
 return <section><Button variant="secondary" onClick={()=>setOpen(v=>!v)}>{open?'收起请求对照':'对照酒馆与游戏请求'}</Button>{open&&<div><label>预览用途<select value={task} onChange={e=>setTask(e.target.value as Purpose)}>{Object.entries(purposes).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><p>使用中性对话和当前设置在本机组装请求。</p>{error&&<p role="alert">{error}</p>}{report&&<><p>{report.protocol} · 消息顺序 {report.roles.join(' → ')} · 预填充{report.prefill?'已选':'未选'} · 工具 {report.tools.join('、')||'无'}</p>{report.rows.length>0&&<ol>{report.rows.map((row,i)=><li key={i}>{row.name} · 酒馆{row.enabled?'启用':'关闭'} · {row.role}{row.position===1?' · 深度 '+row.depth:''} · 游戏 {row.status}</li>)}</ol>}</>}</div>}</section>;
}
