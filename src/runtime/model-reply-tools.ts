import type {ChatMessage} from './model-gateway';

/** Text-only provider tools. They never dispatch a game command or execute code. */
export interface ModelReplyTool {
 name:string;description:string;parameters:{type:'object';properties:Record<string,{type:'string';description?:string}>;required?:string[]};
 mode:'ack'|'text';textField?:string;choice?:'auto'|'required';tasks?:string[];
}
export const REPLY_TOOL_TASKS=['story-writer','story-rewrite','private-chat','party-chat'];
export function validateReplyTools(input:ModelReplyTool[]|undefined):ModelReplyTool[]|undefined{
 if(input===undefined)return undefined;
 if(!Array.isArray(input)||input.length>4||JSON.stringify(input).length>24000)throw Error('文字回复工具最多4项，内容不超过24000字');
 const names=new Set<string>();
 return input.map(t=>{
  if(!t||!/^[a-zA-Z_][a-zA-Z0-9_-]{0,63}$/.test(t.name)||names.has(t.name)||typeof t.description!=='string'||t.description.length>4000)throw Error('文字回复工具名称或说明无效');names.add(t.name);
  if(!['ack','text'].includes(t.mode)||t.choice!==undefined&&!['auto','required'].includes(t.choice))throw Error('文字回复工具处理方式无效');
  const p=t.parameters;if(!p||p.type!=='object'||!p.properties||typeof p.properties!=='object'||Array.isArray(p.properties)||Object.keys(p.properties).length>12)throw Error('文字回复工具需要对象参数');
  for(const [key,value]of Object.entries(p.properties))if(!/^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/.test(key)||!value||value.type!=='string'||value.description!==undefined&&(typeof value.description!=='string'||value.description.length>4000))throw Error('文字回复工具仅接受已声明的文本字段');
  if(p.required!==undefined&&(!Array.isArray(p.required)||p.required.some(k=>!Object.hasOwn(p.properties,k))))throw Error('文字回复工具必填字段不存在');
  if(t.mode==='text'&&(!t.textField||!Object.hasOwn(p.properties,t.textField)))throw Error('请选择文字回复工具的正文字段');
  if(t.tasks!==undefined&&(!Array.isArray(t.tasks)||t.tasks.some(k=>!REPLY_TOOL_TASKS.includes(k))))throw Error('文字回复工具仅用于小说和交谈');
  return {name:t.name,description:t.description,parameters:{type:'object',properties:Object.fromEntries(Object.entries(p.properties).map(([k,v])=>[k,{type:'string',...(v.description===undefined?{}:{description:v.description})}])),...(p.required?{required:[...p.required]}:{})},mode:t.mode,...(t.textField?{textField:t.textField}:{}),...(t.choice?{choice:t.choice}:{}),...(t.tasks?{tasks:[...t.tasks]}:{})};
 });
}
export function activeReplyTools(profile:{replyTools?:ModelReplyTool[]},task:string,json=false):ModelReplyTool[]{
 return json||!REPLY_TOOL_TASKS.includes(task)?[]:(validateReplyTools(profile.replyTools)??[]).filter(t=>!t.tasks||t.tasks.includes(task));
}
export function replyToolRound(choice:any,tools:ModelReplyTool[],wire:string):{messages:ChatMessage[];text?:string;names:string[]}|null{
 const m=choice?.message,raw=m?.tool_calls??m?.providerContent?.filter((p:any)=>p.functionCall).map((p:any,i:number)=>({id:p.functionCall.id??'native-call-'+i,nativeId:p.functionCall.id,type:'function',function:{name:p.functionCall.name,arguments:JSON.stringify(p.functionCall.args??{})}}));
 if(!raw?.length)return null;
 if(!['compatible','gemini','responses'].includes(wire))throw Error('当前协议不支持文字回复工具');
 if(!Array.isArray(raw)||raw.length>4)throw Error('模型一次返回了过多文字工具调用');
 const ids=new Set<string>(),results:ChatMessage[]=[],names:string[]=[],texts:string[]=[];
 for(const call of raw){
  const tool=tools.find(t=>t.name===call.function?.name);if(!tool)throw Error('模型请求了未声明的文字回复工具');
  if(typeof call.id!=='string'||!call.id||call.id.length>200||ids.has(call.id))throw Error('模型返回的文字工具编号无效');ids.add(call.id);names.push(tool.name);
  const rawArgs=call.function.arguments;if(typeof rawArgs!=='string'||rawArgs.length>256000)throw Error('文字工具参数无效或过长');
  let args:any;try{args=JSON.parse(rawArgs);}catch{throw Error('文字工具参数没有完整结束，请重试');}
  if(!args||typeof args!=='object'||Array.isArray(args)||Object.entries(args).some(([k,v])=>!Object.hasOwn(tool.parameters.properties,k)||typeof v!=='string')||(tool.parameters.required??[]).some(k=>typeof args[k]!=='string'))throw Error('文字工具返回的字段不符合声明');
  if(tool.mode==='text'){const text=args[tool.textField!];if(typeof text!=='string'||!text.trim())throw Error('文字工具没有返回正文');texts.push(text);}
  else results.push({role:'tool',name:tool.name,tool_call_id:call.id,content:'{"ok":true}',...(wire==='gemini'?{providerContent:[{functionResponse:{...(call.nativeId?{id:call.nativeId}:{}),name:tool.name,response:{ok:true}}}]}:{})});
 }
 if(texts.length&&results.length)throw Error('一次回复不能混用正文输出和确认工具');
 if(texts.length)return {messages:[],text:texts.join('\n\n'),names};
 return {messages:[{role:'assistant',content:m.content??'',...(wire==='compatible'?{tool_calls:structuredClone(raw)}:{}),...(m.providerContent?{providerContent:structuredClone(m.providerContent)}:{}),...(m.reasoning_content?{reasoning_content:m.reasoning_content}:{})},...results],names};
}
