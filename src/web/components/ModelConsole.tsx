import {useState,useRef,useEffect} from 'react';
import {Button,Panel,Modal,ActionSection} from '../components';
import {useGameController} from '../game-context';
import {ModelParameters} from '../ModelParameters';
import {MODEL_TASKS} from '../../runtime/model-settings';
import {assignedModelId,normalizeModelLibrary,adoptModelLibrary,publicModelConfiguration,TASK_PARENTS,type LibraryModel} from '../../runtime/model-library';
import type {ModelListResult,ModelProfile} from '../../runtime/model-gateway';
import {PROVIDER_PRESETS,providerForConnection,OPEN_CODE_GO,vertexProject} from '../../shared/model-providers';
import {ChatGPTPlanConnection} from './ChatGPTPlanConnection';
import {CHATGPT_API} from '../../shared/chatgpt-plan';
import {isAndroidGame} from '../../runtime/android-platform';
type Profile=Omit<ModelProfile,'apiKey'>;
export default function ModelConsole({profile,onChange,keys,onKeys,onEditPrompt}:{profile:Profile;onChange:(profile:Profile)=>void;keys:Record<string,string>;onKeys:(keys:Record<string,string>)=>void;onEditPrompt:(task:string)=>void}){
 const controller=useGameController(),models=profile.modelLibrary!,[editing,setEditing]=useState(models[0]?.id),[task,setTask]=useState('story-writer'),[removing,setRemoving]=useState(''),[replacement,setReplacement]=useState(''),[message,setMessage]=useState(''),[operation,setOperation]=useState<'list'|'test'|null>(null);
 const abortRef=useRef<AbortController|null>(null),[choices,setChoices]=useState<(Pick<ModelListResult,'models'|'protocols'|'displayNames'>&{scope:string})|null>(null);
 const [manualModelFor,setManualModelFor]=useState('');
 const model=models.find(m=>m.id===editing)??models[0],selected=models.find(m=>m.id===assignedModelId(profile,task))!;
 // Keep unsaved credentials only in memory; lists belong to one connection draft.
 const listProtocol=model.baseUrl===OPEN_CODE_GO?'go-catalog':model.generation?.protocol;
 const scope=JSON.stringify([model.id,model.channelMode,model.chatgptAccountId,model.transport,model.baseUrl,listProtocol,model.connection?.auth,model.connection?.authName,keys[model.id]]),scopeRef=useRef(scope);scopeRef.current=scope;
 useEffect(()=>{setChoices(null);setMessage('');return()=>{abortRef.current?.abort();};},[scope]);
 const canImportVertex=!!window.douluoDesktop?.credentials?.importVertex;
 const vertexEndpoint=vertexProject(model.baseUrl);
 const vertex=model.channelMode==='vertex'||(!model.channelMode&&canImportVertex&&model.transport==='browser'&&!!vertexEndpoint);
 const [regionDraft,setRegionDraft]=useState<{id:string;region:string}|null>(null);
 const vertexRegion=regionDraft?.id===model.id?regionDraft.region:vertexEndpoint?.region??'global';
 const available=choices?.scope===scope?choices.models:[];
 const plan=model.channelMode==='chatgpt',planBridge=window.douluoDesktop?.chatgpt;
 const provider=!vertex&&!plan&&model.channelMode!=='custom'?providerForConnection(model.baseUrl):undefined;
 const custom=!vertex&&!plan&&!provider;
 const listed=choices?.scope===scope;
 const modelOptions=model.model&&!available.includes(model.model)?[model.model,...available]:available;
 const orderedTasks=[...MODEL_TASKS.filter(t=>!TASK_PARENTS[t.id]&&t.id!=='format-repair'),...MODEL_TASKS.filter(t=>!!TASK_PARENTS[t.id]||t.id==='format-repair')];
 const uses=(id:string)=>MODEL_TASKS.filter(t=>assignedModelId(profile,t.id)===id).map(t=>t.label);
 const patch=(value:Partial<LibraryModel>)=>onChange({...profile,modelLibrary:models.map(m=>m.id===model.id?{...m,...value}:m)});
 const clearDraftKey=()=>{const next={...keys};delete next[model.id];onKeys(next);};
 const selectProvider=(label:string)=>{
  const next=PROVIDER_PRESETS.find(p=>p.label===label);
  const nextVertex=label==='vertex',nextPlan=label==='chatgpt';
  const baseUrl=nextPlan?CHATGPT_API:next?.url??'';
  setManualModelFor('');setRegionDraft(null);setChoices(null);setMessage('');
  clearDraftKey();
  patch({baseUrl,chatgptAccountId:undefined,channelMode:nextPlan?'chatgpt':nextVertex?'vertex':next?undefined:'custom',model:'',transport:nextVertex||nextPlan?'browser':next?'server':undefined,
   generation:{...model.generation,protocol:nextPlan?'responses':nextVertex?'compatible':next?.protocol??'auto'},
   connection:{stream:model.connection?.stream??true,jsonMode:'prompt',auth:next?.protocol==='anthropic'?'x-api-key':next?.protocol==='gemini'?'x-goog-api-key':'bearer'}});
 };
 const selectModel=(id:string)=>{
  if(provider?.url!==OPEN_CODE_GO){patch({model:id});return;}
  const protocol=choices?.scope===scope?choices.protocols?.[id]:undefined;
  patch({model:id,generation:{...model.generation,protocol:protocol??'auto'}});
 };
 const addressField=<label>服务地址<input value={model.baseUrl} readOnly={!custom} placeholder="例如 http://127.0.0.1:11434/v1" onChange={e=>{
  patch({baseUrl:e.target.value,channelMode:'custom',model:''});clearDraftKey();setManualModelFor('');
 }}/></label>;
 const importVertex=async()=>{
  try{
   const result=await window.douluoDesktop?.credentials?.importVertex?.(model.id,vertexRegion.trim());
   if(!result)return;
   patch({channelMode:'vertex',baseUrl:result.baseUrl,transport:'browser',connection:{...model.connection,auth:'bearer'},generation:{...model.generation,protocol:'compatible'}});
   onKeys({...keys,[model.id]:result.credential});
  }catch(error){setMessage((error as Error).message);}
 };
 const add=(copy=false)=>{const id=crypto.randomUUID();onChange({...profile,modelLibrary:[...models,copy?{...model,id,label:model.label+' 副本'}:{id,label:'模型'+(models.length+1),baseUrl:'',model:'',generation:{protocol:'auto'},connection:{auth:'bearer',stream:true,jsonMode:'prompt'}}]});setEditing(id);};
 const reorder=(delta:number)=>{const index=models.findIndex(m=>m.id===model.id),other=index+delta;if(other<0||other>=models.length)return;const next=[...models];[next[index],next[other]]=[next[other],next[index]];onChange({...profile,modelLibrary:next});};
 const allocate=(all=false)=>{const first=models[0].id,other=all||models.length===1?first:models[1].id;onChange({...profile,assignments:Object.fromEntries(MODEL_TASKS.filter(t=>!TASK_PARENTS[t.id]).map(t=>[t.id,t.id==='story-writer'?first:other]))});};
 const connect=async(kind:'list'|'test')=>{
  if(abortRef.current)return;
  const abort=new AbortController();abortRef.current=abort;setOperation(kind);setMessage(kind==='list'?'正在获取 '+model.label+' 的模型列表…':'正在测试 '+model.label);
  if(kind==='list')setChoices(null);
  const current=()=>abortRef.current===abort&&!abort.signal.aborted&&scopeRef.current===scope;
  try{
   const gateway=controller.previewModel({...model,id:model.id},keys[model.id]??'');
   if(kind==='list'){const result=await gateway.listModels(abort.signal);if(current()){setChoices({scope,models:result.models,protocols:result.protocols,displayNames:result.displayNames});setMessage(result.message);setManualModelFor(result.manualEntryRequired?model.id:'');}}
   else{const result=await gateway.testConnection(abort.signal);if(current())setMessage(result.message);}
  }catch(error){if(current())setMessage((error as Error).message);}
  finally{if(abortRef.current===abort){abortRef.current=null;setOperation(null);}}
 };
 const cancel=()=>{abortRef.current?.abort();setMessage(operation==='list'?'已取消获取模型列表，仍可手动填写模型名。':'已取消连接测试。');};
 const exportPreset=()=>{const data={format:'douluo-model-library/1',profile:publicModelConfiguration(profile)},url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='斗罗大陆-模型用途预设.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),0);};
 const importPreset=async(file:File)=>{try{const data=JSON.parse(await file.text());if(data.format!=='douluo-model-library/1')throw Error('请选择模型库用途预设');const imported=normalizeModelLibrary(adoptModelLibrary(data.profile));onChange(imported);onKeys({});setEditing(imported.modelLibrary![0].id);setMessage('预设已读入，保存后生效；预设不含密钥。');}catch(error){setMessage((error as Error).message);}};
 return <div className="model-console">
 <Panel title="模型库"><p>选择渠道并连接，获取列表后选择模型，再保存设置。</p><nav className="model-library-tabs" aria-label="模型库">{models.map(m=><Button key={m.id} variant={m.id===model.id?'primary':'secondary'} onClick={()=>setEditing(m.id)}>{m.label}</Button>)}</nav>
 <div className="field-actions"><Button onClick={()=>add()}>新增模型</Button><Button variant="secondary" onClick={()=>add(true)}>复制模型</Button><Button variant="ghost" onClick={()=>reorder(-1)}>上移</Button><Button variant="ghost" onClick={()=>reorder(1)}>下移</Button><Button variant="danger" disabled={models.length===1} onClick={()=>{setRemoving(model.id);setReplacement(models.find(m=>m.id!==model.id)!.id);}}>删除模型</Button></div>
 <div className="form-grid">
  <label>模型渠道<select value={plan?'chatgpt':vertex?'vertex':provider?.label??''} onChange={e=>selectProvider(e.target.value)}>
   <option value="">自定义地址 / 本地模型</option>
   {(canImportVertex||vertex)&&<option value="vertex">Google Vertex AI</option>}
   {(planBridge||plan)&&<option value="chatgpt">ChatGPT 套餐授权</option>}
   <optgroup label="订阅套餐">{PROVIDER_PRESETS.filter(p=>p.plan).map(p=><option key={p.label}>{p.label}</option>)}</optgroup>
   <optgroup label="常用 API">{PROVIDER_PRESETS.filter(p=>!p.plan).map(p=><option key={p.label}>{p.label}</option>)}</optgroup>
  </select></label>
  {plan&&(planBridge?<ChatGPTPlanConnection key={model.id} bridge={planBridge} accountId={model.chatgptAccountId} onSelect={id=>{patch({chatgptAccountId:id,model:''});setChoices(null);}}/>:<p>请在桌面版中使用 ChatGPT 套餐。</p>)}
  {vertex&&canImportVertex&&<div className="field-actions"><label>Vertex AI 地区<input value={vertexRegion} onChange={e=>{
   setRegionDraft({id:model.id,region:e.target.value});
   if(model.baseUrl){patch({baseUrl:'',model:''});clearDraftKey();}
  }} placeholder="global"/></label><Button variant="secondary" onClick={()=>void importVertex()}>导入服务账号 JSON</Button>
  {vertexEndpoint&&<span>项目 · {vertexEndpoint.project}</span>}</div>}
  {vertex&&!canImportVertex&&<p>请在桌面版导入 Vertex 服务账号。</p>}
  {custom&&addressField}
  {!vertex&&!plan&&<label>{provider?.plan?'套餐 API 密钥':provider?'API 密钥':'API 密钥（没有可留空）'}<input type="password" autoComplete="off" value={keys[model.id]??''} placeholder={controller.modelCredentialMatches(model)&&controller.modelKeys.status(model.id)==='session'?'仅本次会话有效':controller.modelCredentialMatches(model)&&controller.modelKeys.status(model.id)==='saved'?'已保存，留空保留':'粘贴模型服务提供的密钥'} onChange={e=>{const next={...keys};if(e.target.value)next[model.id]=e.target.value;else delete next[model.id];onKeys(next);}}/></label>}
 </div>
 {provider?.plan&&<p className="muted">请使用自己的套餐密钥。额度和账号使用范围以服务商规则为准，超出范围可能导致限流或封号。</p>}
 {custom&&<p className="muted">手机终端或本机服务可填 127.0.0.1；另一台设备填它的局域网 IP 或域名。</p>}
 <div className="field-actions"><Button disabled={!!operation||!model.baseUrl.trim()||(plan&&!model.chatgptAccountId)} onClick={()=>void connect('list')}>{operation==='list'?'正在获取…':'获取模型列表'}</Button>{operation&&<Button variant="ghost" onClick={cancel}>停止连接</Button>}</div>
 <div className="model-name-field">
  {(!listed||available.length>0||manualModelFor!==model.id)&&<label>模型<select aria-label="模型" value={manualModelFor===model.id?'manual-entry':model.model?'id:'+model.model:''} disabled={!listed&&!model.model} onChange={e=>{
   if(e.target.value==='manual-entry'){setManualModelFor(model.id);selectModel('');}
   else {setManualModelFor('');selectModel(e.target.value.slice(3));}
  }}><option value="">{listed?'请选择模型':'请先获取模型列表'}</option>{modelOptions.map(id=><option key={id} value={'id:'+id}>{choices?.scope===scope?choices.displayNames?.[id]??id:id}</option>)}{!plan&&<option value="manual-entry">手动填写模型名</option>}</select></label>}
  {manualModelFor===model.id&&<label>模型名称<input value={model.model} placeholder="填写服务商提供的模型 ID" onChange={e=>selectModel(e.target.value)}/></label>}
 </div>
 <div className="field-actions"><Button variant="secondary" disabled={!!operation||!model.baseUrl.trim()||!model.model.trim()} onClick={()=>void connect('test')}>{operation==='test'?'正在验证生成…':'验证所选模型'}</Button></div><p role="status">{message}</p>
 {!plan&&<ActionSection title="高级连接设置">
  <label>模型显示名称<input value={model.label} onChange={e=>patch({label:e.target.value})}/></label>
  {provider&&addressField}
  <p className="muted">使用此模型的用途：{uses(model.id).join('、')||'尚未分配'}。</p>
  <div className="form-grid">{!isAndroidGame&&<label>请求通路<select value={model.transport??'auto'} onChange={e=>patch({transport:e.target.value==='auto'?undefined:e.target.value as any})}><option value="auto">自动</option><option value="browser">浏览器直接连接</option><option value="server">公网连接（游戏服务器）</option></select></label>}
  <label>连接协议<select value={model.generation?.protocol??'auto'} onChange={e=>patch({generation:{...model.generation,protocol:e.target.value as any}})}>{[['auto','自动识别'],['compatible','OpenAI兼容'],['deepseek','DeepSeek'],['responses','Responses'],['anthropic','Anthropic Messages'],['gemini','Gemini原生']].map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
  <label>认证方式<select value={model.connection?.auth??'bearer'} onChange={e=>patch({connection:{...model.connection,auth:e.target.value as any}})}>{[['bearer','Bearer'],['x-api-key','X-API-Key'],['x-goog-api-key','Google API Key'],['header','自定义请求头'],['query','查询参数'],['auto','自动'],['none','无认证']].map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
  {['header','query'].includes(model.connection?.auth??'')&&<label>认证字段名<input value={model.connection?.authName??''} onChange={e=>patch({connection:{...model.connection,authName:e.target.value}})}/></label>}
  <label>结构化输出<select value={model.connection?.jsonMode??'prompt'} onChange={e=>patch({connection:{...model.connection,jsonMode:e.target.value as any}})}><option value="prompt">通过提示词</option><option value="native">接口原生JSON</option><option value="schema">JSON Schema（接口支持时）</option><option value="auto">自动</option></select></label></div>
  <label><input type="checkbox" checked={model.connection?.stream??true} onChange={e=>patch({connection:{...model.connection,stream:e.target.checked}})}/>流式接收</label><label><input type="checkbox" checked={model.connection?.extendedParameters??false} onChange={e=>patch({connection:{...model.connection,extendedParameters:e.target.checked}})}/>服务支持扩展采样与思考参数</label>
  <Button variant="ghost" onClick={()=>{onKeys({...keys,[model.id]:''});setMessage('此模型的本机凭据将在保存时删除。');}}>清除此模型密钥</Button>
 </ActionSection>}
 <div className="field-actions"><Button variant="secondary" onClick={exportPreset}>导出预设（不含密钥）</Button><label>导入预设<input type="file" accept="application/json,.json" onChange={e=>{const f=e.target.files?.[0];if(f)void importPreset(f);e.target.value='';}}/></label></div></Panel>
 <Panel title="用途分配"><p>为小说写作、人物交谈和 NPC 决策分别选择模型。</p><div className="field-actions"><Button onClick={()=>allocate()}>小说用首个模型，其余用第二个</Button><Button variant="secondary" onClick={()=>allocate(true)}>全部使用首个模型</Button></div>
 <div className="model-purpose-layout"><nav aria-label="模型用途">{orderedTasks.map(t=><button key={t.id} aria-pressed={task===t.id} onClick={()=>setTask(t.id)}>{TASK_PARENTS[t.id]?'↳ ':''}{t.label}<small>{models.find(m=>m.id===assignedModelId(profile,t.id))?.label}</small></button>)}</nav><section key={task}><h3>{MODEL_TASKS.find(t=>t.id===task)?.label}</h3><label>所用模型<select value={profile.assignments?.[task]??(TASK_PARENTS[task]?'':selected.id)} onChange={e=>{const assignments={...profile.assignments};if(e.target.value)assignments[task]=e.target.value;else delete assignments[task];onChange({...profile,assignments});}}>{TASK_PARENTS[task]&&<option value="">继承 {MODEL_TASKS.find(t=>t.id===TASK_PARENTS[task])?.label}</option>}{models.map(m=><option key={m.id} value={m.id}>{m.label} · {m.model||'未填写模型名'}</option>)}</select></label><p>当前模型：{selected.label} · {selected.model||'待配置'}。{TASK_PARENTS[task]?'未单独填写的参数继承 '+MODEL_TASKS.find(t=>t.id===TASK_PARENTS[task])?.label:'未填写参数使用所选模型与用途默认值'}。</p>
 <Button variant="secondary" onClick={()=>onEditPrompt(task)}>编辑提示词</Button>
 <ActionSection title="高级生成参数"><ModelParameters task={task} profile={profile} onChange={fn=>onChange(fn(profile))}/></ActionSection>
 <label>复制参数到<select defaultValue="" onChange={e=>{if(!e.target.value)return;onChange({...profile,taskOverrides:{...profile.taskOverrides,[e.target.value]:structuredClone(profile.taskOverrides?.[task]??{})}});e.target.value='';}}><option value="">选择目标用途</option>{MODEL_TASKS.filter(t=>t.id!==task).map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
 </section></div></Panel>
 <Modal open={!!removing} title="删除共享模型" onClose={()=>setRemoving('')} actions={<><Button variant="ghost" onClick={()=>setRemoving('')}>取消</Button><Button variant="danger" onClick={()=>{const assignments={...profile.assignments};for(const t of MODEL_TASKS)if(assignedModelId(profile,t.id)===removing)assignments[t.id]=replacement;onChange({...profile,modelLibrary:models.filter(m=>m.id!==removing),assignments});setEditing(replacement);setRemoving('');}}>替换引用并删除</Button></>}><p>受影响用途：{uses(removing).join('、')||'无'}。</p><label>替代模型<select value={replacement} onChange={e=>setReplacement(e.target.value)}>{models.filter(m=>m.id!==removing).map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select></label></Modal>
 </div>;
}
