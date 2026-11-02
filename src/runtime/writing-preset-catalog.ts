import data from '../shared/writing-preset-data.json';
import type {GlobalPrompt} from './model-global-prompts';
import type {WriterPromptPart} from './story-writer-prompts';
import type {ModelReplyTool} from './model-reply-tools';
import type {GenerationSettings} from './model-settings';

export type WritingPresetId='dream'|'ny'|'meow';
export type WritingModelFamily='glm'|'deepseek'|'kimi'|'gemini';
export type WritingPresetSet=`${WritingPresetId}:${WritingModelFamily}`;
type PresetText=Pick<GlobalPrompt,'id'|'name'|'content'|'source'>;
interface BundledWritingPreset {
 id:string;label:string;defaultStyle:string;global:(PresetText&{role:string})[];
 styles:PresetText[];extras:PresetText[];tools:unknown[];
}
export const WRITING_PRESETS:BundledWritingPreset[]=data.presets;
export const WRITING_MODEL_FAMILIES=['glm','deepseek','kimi','gemini'] as const;
export const WRITING_MODEL_LABELS={deepseek:'DeepSeek',glm:'GLM',gemini:'Gemini',kimi:'Kimi'} as const;
export const WRITING_SET_KEYS=WRITING_PRESETS.flatMap(p=>WRITING_MODEL_FAMILIES.map(f=>`${p.id}:${f}` as WritingPresetSet));
export function writingSet(family:string){const [id,modelFamily]=family.split(':');const preset=WRITING_PRESETS.find(p=>p.id===id);return preset&&WRITING_MODEL_FAMILIES.includes(modelFamily as WritingModelFamily)?{preset,modelFamily:modelFamily as WritingModelFamily}:null;}
export function writingSetLabel(family:string){const s=writingSet(family);return s?s.preset.label+' · '+({glm:'GLM',deepseek:'DeepSeek',kimi:'Kimi',gemini:'Gemini'}[s.modelFamily]):family==='deepseek'?'梦境思客 · 已保存版本':family==='gemini'?'小猫之神 · 已保存版本':'自定义';}
export function writingGlobalParts(family:string):GlobalPrompt[]{
 const s=writingSet(family);if(!s)return [];
 const selected=s.preset.global.filter(p=>s.preset.id!=='dream'||p.name===(s.modelFamily==='gemini'?'梦境思客Gemini':'梦境思客')||p.name==='Glm/Gemini禁词'&&['glm','gemini'].includes(s.modelFamily));
 return selected.map(p=>({...p,role:p.role as GlobalPrompt['role'],enabled:true,position:'before',...(p.name==='Glm/Gemini禁词'?{tasks:['story-writer','story-rewrite']}:{ }),...(s.preset.id==='meow'?{tasks:['story-writer','story-rewrite','private-chat','party-chat'],analysis:{start:'<think_nya>',end:'</think_nya>'}}:{})}));
}
export const NEW_WRITER_PRESETS:WriterPromptPart[]=WRITING_PRESETS.flatMap(p=>[
 ...p.styles.map(s=>({...s,kind:'text' as const,category:'style' as const,exclusiveGroup:'文风',enabled:false})),
 ...p.extras.map(s=>({...s,kind:'text' as const,category:'other' as const,enabled:false}))
]);
export function writingReplyTools(family:string):ModelReplyTool[]|undefined{const s=writingSet(family);return s?.preset.tools.length?structuredClone(s.preset.tools) as ModelReplyTool[]:undefined;}
export function writingModelAdapter(model:string,baseUrl:string,family:WritingModelFamily){
 if(!WRITING_MODEL_FAMILIES.includes(family))throw Error('请手动选择预设适配模型');
 const n=model.toLowerCase();
 let host='';try{host=new URL(baseUrl).hostname;}catch{}
 const channel=family==='gemini'?(host==='api.akane.win'?'Vertex':/^pg-/.test(n)?'AI Studio':host==='generativelanguage.googleapis.com'?'Google 官方':'Gemini 兼容'):
  family==='glm'&&host==='open.bigmodel.cn'?'智谱普通按量':family==='deepseek'&&host==='api.deepseek.com'?'DeepSeek 官方':'兼容渠道';
 const native=host==='generativelanguage.googleapis.com'||/\/v1beta\/?$/.test(baseUrl);
 const generation:GenerationSettings={protocol:native?'gemini':family==='deepseek'?'deepseek':'compatible',thinking:family==='deepseek'&&!/pro/.test(n)?'disabled':'enabled',reasoningEffort:'low',temperature:family==='glm'||family==='kimi'||/gemini-4/.test(n)?null:1,topP:family==='glm'||family==='kimi'||/gemini-4/.test(n)?null:.95,topK:null,contextTokens:262144,outputTokens:16384};
 // This relay rejects reasoning conversion for Gemini 4; use its provider default.
 if(channel==='Vertex'&&/gemini-4(?:-|$)/.test(n)){generation.thinking='default';generation.reasoningEffort='default';}
 return {family,channel,generation,connection:{auth:'bearer' as const,jsonMode:'prompt' as const,stream:true,extendedParameters:true}};
}
