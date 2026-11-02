import {resolveTaskProfile} from '../runtime/model-library';
import {useState} from 'react';
import type {ModelProfile} from '../runtime/model-gateway';
import {DEFAULT_REQUEST,MODEL_TASKS,isDeepSeek,resolveModelSettings,type TaskSettings} from '../runtime/model-settings';
import {Button} from './components';

type EditableProfile=Omit<ModelProfile,'apiKey'>;
export function ModelParameters({profile,onChange,task}:{task?:string;profile:EditableProfile;onChange:(update:(profile:EditableProfile)=>EditableProfile)=>void}){
 const [scope,setScope]=useState(task??'');
 const selected=profile.modelLibrary?resolveTaskProfile(profile,scope):scope==='story-writer'&&profile.writer?profile.writer:profile;
 const effective=resolveModelSettingsSafe(profile,scope),deepseek=isDeepSeek(selected.baseUrl,effective.protocol);
 const raw:TaskSettings=scope?(profile.modelLibrary?profile:selected).taskOverrides?.[scope]??{}:{...profile.generation,waitMode:profile.waitMode,...Object.fromEntries(Object.keys(DEFAULT_REQUEST).map(key=>[key,(profile as any)[key]]))};
 const patch=(key:keyof TaskSettings,value:any)=>onChange(current=>{
  if(scope==='story-writer'&&current.writer){const next={...current.writer.taskOverrides?.[scope]};if(value===undefined)delete next[key];else (next as any)[key]=value;if(key==='waitMode')for(const field of ['timeoutMs','firstByteTimeoutMs','idleTimeoutMs'])delete (next as any)[field];return {...current,writer:{...current.writer,taskOverrides:{...current.writer.taskOverrides,[scope]:next}}};}
  if(key==='waitMode'){if(scope)return {...current,taskOverrides:{...current.taskOverrides,[scope]:{...current.taskOverrides?.[scope],waitMode:value,timeoutMs:undefined,firstByteTimeoutMs:undefined,idleTimeoutMs:undefined}}};return {...current,waitMode:value,timeoutMs:undefined,firstByteTimeoutMs:undefined,idleTimeoutMs:undefined};}
  if(scope){const next={...current.taskOverrides?.[scope]};if(value===undefined)delete next[key];else (next as any)[key]=value;return {...current,taskOverrides:{...current.taskOverrides,[scope]:next}};}
  if(key in DEFAULT_REQUEST)return {...current,[key]:value};
  const next={...current.generation};if(value===undefined)delete (next as any)[key];else (next as any)[key]=value;return {...current,generation:next};
 });
 const reset=()=>onChange(current=>{if(scope==='story-writer'&&current.writer){const next={...current.writer.taskOverrides};delete next[scope];return {...current,writer:{...current.writer,taskOverrides:next}};}if(scope){const next={...current.taskOverrides};delete next[scope];return {...current,taskOverrides:next};}return {...current,generation:{},taskOverrides:{},waitMode:undefined,firstByteTimeoutMs:undefined,timeoutMs:undefined,connectTimeoutMs:undefined,idleTimeoutMs:undefined,retryCount:undefined,repairFormat:undefined};});
 const inherited=scope?'继承模型／上级用途':'按用途默认';
 const select=(key:keyof TaskSettings,label:string,options:[string,string][]) => <label>{label}<select value={raw[key]===undefined?'':String(raw[key])} onChange={e=>patch(key,e.target.value===''?undefined:(key==='repairFormat'||key==='stream')?e.target.value==='true':e.target.value)}><option value="">{inherited}</option>{options.map(([value,text])=><option key={value} value={value} disabled={key==='reasoningEffort'&&deepseek&&value==='medium'}>{text}</option>)}</select></label>;
 const number=(key:keyof TaskSettings,label:string,scale=1,step='1')=><label>{label}<input type="number" min={key==='temperature'||key==='topP'||key==='retryCount'?'0':'1'} step={step} value={raw[key]==null?'':Number(raw[key])/scale} placeholder={inherited} onChange={e=>patch(key,e.target.value===''?undefined:Number(e.target.value)*scale)}/></label>;
 return <>
  {!task&&<label>参数适用范围<select aria-label="参数适用范围" value={scope} onChange={e=>setScope(e.target.value)}><option value="">全局配置</option>{MODEL_TASKS.map(task=><option key={task.id} value={task.id}>{task.label}</option>)}</select></label>}
  <p className="muted">留空参数继承所选模型或上级用途。当前用途的明确设置优先；保存后从下一次请求生效。</p>
  <div className="form-grid">
   {task&&select('stream','流式接收',[['true','开启'],['false','关闭']])}
   {select('protocol','参数协议',[['auto','自动识别'],['deepseek','DeepSeek（含兼容中转）'],['compatible','通用 Chat Completions'],['responses','Responses'],['anthropic','Claude Messages'],['gemini','Gemini 原生']])}
   {select('thinking','思考模式',[['default','跟随模型默认'],['enabled','开启'],['disabled','关闭']])}
   {select('reasoningEffort','思考级别',[['default','跟随模型默认'],['low','低'],['medium',deepseek?'中（此模型不支持独立档位）':'中'],['high','高'],['max','最高']])}
   {number('temperature','温度 Temperature',1,'0.1')}{number('topP','Top-P',1,'0.01')}{number('topK','Top-K')}
   {number('contextTokens','上下文容量（Token）')}{number('outputTokens','单次输出上限（Token）')}
   {select('waitMode','等待档位',[['standard','标准：首包 3 分钟，总计 10 分钟'],['long','长思考：首包 10 分钟，总计 20 分钟']])}
   {number('firstByteTimeoutMs','首包等待时限（秒）',1000)}{number('timeoutMs','操作总等待时限（秒）',1000)}{number('connectTimeoutMs','网络建连时限（秒）',1000)}{number('idleTimeoutMs','接收空闲时限（秒）',1000)}
   {number('retryCount','失败重试次数')}{select('repairFormat','答复格式修复',[['true','开启'],['false','关闭']])}
  </div>
  <Button variant="secondary" onClick={reset}>{scope?'恢复此用途的继承设置':'恢复推荐生成配置'}</Button>
 </>;
}
function resolveModelSettingsSafe(profile:Omit<ModelProfile,'apiKey'>,scope:string){try{return resolveModelSettings(profile,scope);}catch{return resolveModelSettings({},scope);}}
