import type {CompiledStoryPrompt,StoryPromptConfig} from './story-prompts';
import type {modelContextBudget} from '../shared/model-context';
import {writerPromptParts} from './story-writer-prompts';

export interface StoryBudgetSource {id:string;label:string;estimatedTokens:number;messageIndexes:number[];editable:boolean}
/** Attribute the authoritative estimate; never inspect, shorten or rewrite message contents. */
export function storyPromptBudgetSources(trace:CompiledStoryPrompt['trace'],budget:ReturnType<typeof modelContextBudget>,config:StoryPromptConfig):StoryBudgetSource[]{
 const rows=new Map<string,StoryBudgetSource>(),byIndex=new Map(trace.map(t=>[t.index,t]));
 const histories=trace.filter(t=>t.source.startsWith('history:')),lastHistory=Math.max(-1,...histories.map(t=>Number(t.source.slice(8))));
 const main=trace.filter(t=>t.source==='slot:main');
 const add=(id:string,label:string,tokens:number,index:number|undefined,editable=false)=>{
  const row=rows.get(id)??{id,label,estimatedTokens:0,messageIndexes:[],editable};row.estimatedTokens+=tokens;if(index!==undefined)row.messageIndexes.push(index);rows.set(id,row);
 };
 for(const message of budget.messages){
  const t=byIndex.get(message.index),source=t?.source??`message:${message.index}`;
  if(source.startsWith('module:')){const id=source.slice(7);add(source,config.modules.find(m=>m.id===id)?.name??id,message.estimatedTokens,message.index,true);}
  else if(source==='global-prompts')add(source,'全局破限提示词',message.estimatedTokens,message.index,true);
  else if(source.startsWith('writer-prompt:')){const id=source.slice(14);add(source,writerPromptParts(config).find(p=>p.id===id)?.name??id,message.estimatedTokens,message.index,true);}
  else if(source==='style'||source==='nsfw')add(source,source==='style'?'文风':'NSFW',message.estimatedTokens,message.index,true);
  else if(source.startsWith('history:')){const current=Number(source.slice(8))===lastHistory;add(current?'current-input':'history',current?'本次输入':'近期对话',message.estimatedTokens,message.index);}
  else if(source==='slot:main'&&main.length===2)add(message.index===main[0].index?'rules':'facts',message.index===main[0].index?'主持与写作规则':'当前事实、行动结果与取回记忆',message.estimatedTokens,message.index);
  else add(source,source.startsWith('slot:')?`资料槽 ${source.slice(5)}`:`消息 ${message.index+1}`,message.estimatedTokens,message.index);
 }
 if(budget.prefillInput){const module=config.modules.find(m=>m.id===config.prefillId);add('prefill',`助手预填充${module?` · ${module.name}`:''}`,budget.prefillInput,undefined,true);}
 return [...rows.values()].sort((a,b)=>b.estimatedTokens-a.estimatedTokens);
}
