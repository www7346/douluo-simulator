import {modelPromptText} from '../runtime/model-prompt-templates';
export {STORY_FACT_REFERENCE_CONTRACT} from '../shared/model-prompt-defaults';
import type {StoryWritingPackage} from './story-writing-package';
import {selectStoryWritingView} from './story-writing-view';
import {projectCommerceWritingFacts} from '../runtime/story-commerce-reading';
import {createHash} from 'node:crypto';

/** A presentation reference into the exact frozen reading, never a second state. */
export const STORY_FACT_REFERENCE_VERSION=4;

export interface StoryFactBinding {path:string;start:number;end:number;text:string;packageId:string}
const escape=(key:string)=>key.replace(/~/g,'~0').replace(/\//g,'~1');

export function storyFactReferenceProtocol(p:StoryWritingPackage){
 return {version:STORY_FACT_REFERENCE_VERSION,packageId:p.id,
  format:modelPromptText({},'fact-reference-format'),
  source:modelPromptText({},'fact-reference-source'),
  value:modelPromptText({},'fact-reference-value')};
}

/** Issue complete scalar references beside their exact values. The author
 * copies a token; it never constructs a package ID, record path or field name.
 * Types and original values remain intact; metadata is presentation only. */
export function storyFactReferenceReading(p:StoryWritingPackage){
 const paths=new Map<string,string>();
 const sourceId=p.origin.writingSection?.sourcePackageId??p.id;
 const visit=(value:any,path:string):any=>{
  if(Array.isArray(value))return value.map((v,i)=>visit(v,`${path}/${i}`));
  if(!value||typeof value!=='object')return value;
  if(Object.hasOwn(value,'$fact'))throw Error('事实资料与正文引用标识冲突');
  // Filtering a section may change array positions, but the original event
  // step and participant identity still identify the same source record.
  const identity=path.replace(/^\/events\/(\d+)(?=\/|$)/,(_,i)=>'/event-step/'+p.facts.events[Number(i)].step)
   .replace(/^\/participants\/(\d+)(?=\/|$)/,(_,i)=>'/person/'+escape(p.facts.participants[Number(i)].id));
  const references:Record<string,string>={};
  for(const [key,v] of Object.entries(value))if(typeof v==='number'&&Number.isFinite(v)
   ||['label','name','color','colour'].includes(key)&&typeof v==='string'&&v.trim()&&v.length<=2000&&!v.includes('[[')){
   const fieldPath=path+'/'+escape(key);
   const id=createHash('sha256').update(JSON.stringify([sourceId,identity, key,v])).digest('hex').slice(0,12);
   if(paths.has(id)&&paths.get(id)!==fieldPath)throw Error('正文事实引用编号发生碰撞');
   paths.set(id,fieldPath);references[key]=`[[fact:${id}]]`;
  }
  return {...(Object.keys(references).length?{$fact:references}:{}),...Object.fromEntries(Object.entries(value).map(([key,v])=>[key,visit(v,path+'/'+escape(key))]))};
 };
 const facts=projectCommerceWritingFacts(visit(selectStoryWritingView(p,false).facts,'')),visible=new Set<string>();
 const collect=(value:any):void=>{if(!value||typeof value!=='object')return;for(const token of Object.values(value.$fact??{}))if(typeof token==='string')visible.add(token);for(const child of Object.values(value))collect(child);};collect(facts);
 for(const id of paths.keys())if(!visible.has(`[[fact:${id}]]`))paths.delete(id);
 return {facts:facts as StoryWritingPackage['facts'],paths};
}

export function storyFactReferenceFor(p:StoryWritingPackage,path:string){
 const reference=[...storyFactReferenceReading(p).paths].find(([,source])=>source===path)?.[0];
 if(!reference)throw Error('该字段没有本次作者资料引用');
 storyFactReferenceValue(p,path);
 return `[[fact:${reference}]]`;
}

/** Scalar lookup is limited to the author's selected view, including its time scope. */
export function storyFactReferenceValue(p:StoryWritingPackage,path:string,facts=selectStoryWritingView(p).facts):string{
 if(!path.startsWith('/')||path.length>2048||/~(?![01])/u.test(path))throw Error('正文事实引用路径无效');
 let value:unknown=facts;
 for(const encoded of path.slice(1).split('/')){
  const key=encoded.replace(/~1/g,'/').replace(/~0/g,'~');
  if(['__proto__','prototype','constructor'].includes(key)||!value||typeof value!=='object'||!Object.hasOwn(value,key))throw Error('正文事实引用不在本次实际发送资料中');
  value=(value as Record<string,unknown>)[key];
 }
 if(typeof value==='number'&&Number.isFinite(value))return String(value);
 if(typeof value==='string'&&value.trim()&&value.length<=2000&&!value.includes('[['))return value;
 throw Error('正文事实引用须为已知的数值或文字，不能以空值或整个对象代替');
}

/** Detect explicit unbound variable spellings, not general truth or all Chinese.
 * Figurative motion and ordinary counters are deliberately outside this grammar.
 * Semantic association, paraphrases and capability meaning still require review. */
export function unboundStoryVariables(text:string,names:readonly string[]=[]):string[]{
 let free=text.replace(/\[\[unit:[^\]\r\n]+\]\]/g,'').replace(/\[\[fact:[^\]\r\n]+\]\]/g,'◇');
 for(const name of [...names].filter(n=>n.length>=2).sort((a,b)=>b.length-a.length))free=free.split(name).join('◇');
 const number='[零〇一二两三四五六七八九十百千万亿半\\d０-９]+(?:[.．点][零〇一二两三四五六七八九\\d０-９]+)?';
 const patterns=[
  new RegExp(`${number}\\s*(?:个\\s*)?(?:级|岁|分钟|小时|时辰|金币|银币|铜币|点(?:生命|魂力|护盾|经验)|年(?:的)?(?:魂环|修为|魂兽))`,'gu'),
  new RegExp(`第\\s*${number}\\s*(?:天|日|年|魂环|魂技)`,'gu'),
  /\d{1,2}[:：]\d{2}/gu,
  new RegExp(`(?:生命|魂力|护盾|HP|MP)[的值为是剩余下还只有：:降至恢复上限达到提高了\\s]*${number}`,'giu'),
  /(?:白|黄|紫|黑|红|金|银|蓝|绿)色?(?:的)?魂环/gu,
 ];
 return [...new Set(patterns.flatMap(pattern=>[...free.matchAll(pattern)].map(match=>match[0])))];
}

function referenceNames(value:unknown,out:string[]=[]):string[]{
 if(!value||typeof value!=='object')return out;
 for(const [key,nested] of Object.entries(value))if(key==='name'&&typeof nested==='string')out.push(nested);else if(nested&&typeof nested==='object')referenceNames(nested,out);
 return out;
}

/** Resolve before paragraph/card coordinates are created. Never rewrite a number
 * guessed from nearby words. A literal is a semantic claim, not a broken token:
 * return it for diagnostics and let the same factual review compare its meaning. */
export function renderStoryFactReferences(raw:string,p:StoryWritingPackage){
 const facts=selectStoryWritingView(p).facts,records=storyFactReferenceReading(p).paths,bindings:StoryFactBinding[]=[];
 const pattern=/\[\[fact:([a-f0-9]{12})\]\]/g;
 let rendered='',end=0;
 for(const match of raw.matchAll(pattern)){
  if(!records.has(match[1]))throw Error('正文事实引用不在本次实际发送资料中');
  const path=records.get(match[1])!,text=storyFactReferenceValue(p,path,facts);
  rendered+=raw.slice(end,match.index);const start=rendered.length;rendered+=text;
  bindings.push({path,start,end:rendered.length,text,packageId:p.id});end=match.index!+match[0].length;
 }
 rendered+=raw.slice(end);
 if(/\[\[\s*\/?\s*fact\b/i.test(rendered))throw Error('正文含有不完整或无效的事实引用');
 const unbound=unboundStoryVariables(raw,referenceNames(facts));
 return {text:rendered,bindings,unboundVariables:unbound};
}

/** Available for deterministic diagnostics without maintaining another truth table. */
export function storyFactScalarPaths(p:StoryWritingPackage){
 return [...storyFactReferenceReading(p).paths.values()];
}
