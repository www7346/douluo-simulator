import {activeGlobalPrompts,type GlobalPrompt,type ModelAnalysisBoundary} from './model-global-prompts';

/** Literal boundaries are explicitly configured by the player/preset, never inferred from prose. */
export function modelAnalysisBoundaries(profile:{globalPrompts?:GlobalPrompt[];model?:string;baseUrl?:string},task=''):ModelAnalysisBoundary[]{
 const boundaries=new Map<string,string>();
 for(const part of activeGlobalPrompts(profile,task))if(part.analysis){
  const {start,end}=part.analysis;
  if(boundaries.has(start)&&boundaries.get(start)!==end)throw Error('同一分析开始标签配置了不同结束标签');
  boundaries.set(start,end);
 }
 return [...boundaries].map(([start,end])=>({start,end}));
}

/** Same-line Markdown code spans quote literal tags; unmatched or multiline spans are not guessed. */
function analysisEnd(text:string,offset:number,boundary:ModelAnalysisBoundary,boundaries:ModelAnalysisBoundary[]):number{
 for(let index=offset;index<text.length;index++){
  if(text[index]==='`'){
   let length=1;while(text[index+length]==='`')length++;
   const marker='`'.repeat(length),lineEnd=text.indexOf('\n',index+length);
   let closing=text.indexOf(marker,index+length);
   while(closing>=0&&(lineEnd<0||closing<lineEnd)&&(text[closing-1]==='`'||text[closing+length]==='`'))closing=text.indexOf(marker,closing+length);
   if(closing>=0&&(lineEnd<0||closing<lineEnd)){index=closing+length-1;continue;}
   index+=length-1;
  }
  if(text.startsWith(boundary.end,index))return index;
  if(boundaries.some(item=>text.startsWith(item.start,index)||text.startsWith(item.end,index)))throw Error('分析区标签嵌套或配对不明确，未删除任何正文');
 }
 return -1;
}

/** Only complete leading analysis sections are separated. The final suffix is never rewritten. */
export function separateModelResponse(raw:string,boundaries:ModelAnalysisBoundary[],prefill?:string){
 let content=raw,remainingPrefill=prefill,sections=0,characters=0;
 const opening=(text:string)=>boundaries.find(boundary=>text.trimStart().startsWith(boundary.start));
 const prefixBoundary=prefill?opening(prefill):undefined;
 if(prefixBoundary){
  if(opening(raw))throw Error('服务返回了重复的分析预填充，请核对渠道的续写方式');
  content=prefill+raw;remainingPrefill=undefined;
 }
 for(;;){
  const candidate=content.trimStart(),boundary=opening(content);
  if(!boundary){
   if(boundaries.some(item=>candidate.startsWith(item.end)))throw Error('答复以分析结束标签开头，缺少明确的开始边界');
   break;
  }
  const start=content.length-candidate.length,end=analysisEnd(content,start+boundary.start.length,boundary,boundaries);
  if(end<0)throw Error('分析区没有完整结束，不能将未完成的分析当作正文');
  const length=end+boundary.end.length;characters+=length;sections++;content=content.slice(length);
 }
 if(sections&&!content.trim())throw Error('答复只有分析区，没有最终内容');
 return {content,...(remainingPrefill===undefined?{}:{prefill:remainingPrefill}),analysisSections:sections,analysisCharacters:characters};
}

/** Novel presentation can recover explicit final text without relaxing the
 * structured action/decision protocol or guessing where unfinished thought ends. */
export function novelAnalysisBoundaries(boundaries:ModelAnalysisBoundary[]):ModelAnalysisBoundary[]{
 return [...boundaries,...[{start:'<think>',end:'</think>'},{start:'<analysis>',end:'</analysis>'}].filter(b=>!boundaries.some(existing=>existing.start===b.start))];
}
export const isStoryAuthorTask=(task:string)=>['story-writer','story-rewrite','private-chat','party-chat'].includes(task);
export function normalizeNovelPromptStructure<T extends {prefill?:{content:string}}>(task:string,structure:T|undefined,boundaries:ModelAnalysisBoundary[],json=false):T|undefined{
 if(json||!isStoryAuthorTask(task)||!structure?.prefill||!novelAnalysisBoundaries(boundaries).some(b=>structure.prefill!.content.trim()===b.start))return structure;
 const {prefill,...rest}=structure;return rest as T;
}
export function separateNovelResponse(raw:string,boundaries:ModelAnalysisBoundary[],prefill?:string){
 boundaries=novelAnalysisBoundaries(boundaries);
 const begins=(value:string)=>boundaries.find(b=>value.trimStart().startsWith(b.start));
 const unwrap=(text:string)=>{
  const trimmed=text.trim();
  for(const [start,end] of [['<final>','</final>'],['<正文>','</正文>']])if(trimmed.startsWith(start))return trimmed.slice(start.length,trimmed.endsWith(end)?-end.length:undefined);
  return text;
 };
 try{
  // A returned analysis prefill may be echoed, or replaced by a final-only reply.
  let content=raw,remainingPrefill=prefill,sections=0,characters=0;
  if(prefill&&begins(prefill)){if(!begins(raw))content=prefill+raw;remainingPrefill=undefined;}
  const leading=content.trimStart(),closing=boundaries.find(b=>leading.startsWith(b.end));
  if(closing){characters=content.length-leading.length+closing.end.length;content=leading.slice(closing.end.length);}
  let prose='';
  for(let index=0;index<content.length;){
   if(content[index]==='`'){
    let size=1;while(content[index+size]==='`')size++;
    const marker='`'.repeat(size),end=content.indexOf(marker,index+size),lineEnd=content.indexOf('\n',index+size);
    if(end>=0&&(lineEnd<0||end<lineEnd)){prose+=content.slice(index,end+size);index=end+size;continue;}
   }
   const boundary=boundaries.find(b=>content.startsWith(b.start,index));
   if(boundary){
    const end=analysisEnd(content,index+boundary.start.length,boundary,boundaries);
    if(end<0){
     if(/<(?:final|正文)>/.test(content.slice(index)))throw Error('分析区未结束，尝试读取明确的最终正文');
     if(!prose.trim())throw Error('分析区没有完整结束，不能将未完成的分析当作正文');
     characters+=content.length-index;sections++;break;
    }
    const length=end+boundary.end.length-index;characters+=length;sections++;index=end+boundary.end.length;continue;
   }
   const orphan=boundaries.find(b=>content.startsWith(b.end,index));
   if(orphan){characters+=orphan.end.length;index+=orphan.end.length;continue;}
   prose+=content[index++];
  }
  content=unwrap(prose);
  if(!content.trim())throw Error('答复只有分析区，没有最终内容');
  return {content,...(remainingPrefill===undefined?{}:{prefill:remainingPrefill}),analysisSections:sections,analysisCharacters:characters};
 }
 catch(original){
  const combined=(prefill??'')+raw;
  if(boundaries.some(b=>combined.includes(b.start))){
   for(const [start,end] of [['<final>','</final>'],['<正文>','</正文>']]){
    const at=combined.lastIndexOf(start),endAt=combined.lastIndexOf(end);
    if(at>=0&&(endAt<0||endAt>at&&combined.slice(endAt+end.length).trim()==='')){
     const body=combined.slice(at+start.length,endAt<0?undefined:endAt);
     if(body.trim()&&!boundaries.some(b=>body.includes(b.start)||body.includes(b.end)))return {content:body,analysisSections:1,analysisCharacters:at+start.length};
    }
   }
  }
  throw original;
 }
}
