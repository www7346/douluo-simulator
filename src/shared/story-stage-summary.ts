import {checkStorySummary,checkStorySummaryCandidates,type StorySummary} from './story-summary';
import {checkStorySummaryOriginal,type StorySummaryOriginal} from './story-summary-original';
export interface StoryStageSummary {title:string;sources:StorySummary[]}
/** IDs are local to one original; offsets always address the unchanged UTF-16 source. */
export function stageQuoteCatalog(original:StorySummaryOriginal){
 const quotes:{id:number;field:'input'|'prose';start:number;end:number;text:string}[]=[];
 for(const field of ['input','prose'] as const){
  const source=original[field];let start=0;
  while(start<source.length){
   let end=Math.min(start+240,source.length);
   if(end<source.length&&/[\uD800-\uDBFF]/.test(source[end-1]))end--;
   const window=source.slice(start,end),boundaries=[...window.matchAll(/[。！？!?\n]/g)];
   // Keep paragraphs separate so a quotation of an action does not also carry a neighbouring thought.
   const paragraph=window.match(/\r?\n[ \t]*\r?\n/);
   if(paragraph)end=start+paragraph.index!+paragraph[0].length;
   else if(end<source.length&&boundaries.length){
    const boundary=boundaries.at(-1)!.index!+1;
    // Keep closing quotation marks inside this window with the sentence.
    const closing=window.slice(boundary).match(/^[”’」』"']*/)?.[0].length??0;
    end=start+boundary+closing;
   }
   const text=source.slice(start,end);
   if(text.trim())quotes.push({id:quotes.length,field,start,end,text});
   start=end;
  }
 }
 // Keep the old numeric ids, even when the generated instruction is omitted.
 return original.automaticReportInput?quotes.filter(q=>q.field!=='input'):quotes;
}
const object=(v:any)=>v&&typeof v==='object'&&!Array.isArray(v);
/** A single-turn extraction uses the same source catalogue as stage memory. */
export function quoteSummaryProposal(value:any,original:StorySummaryOriginal):StorySummary {
 if(!object(value)||Object.keys(value).some(k=>k!=='items')||!Array.isArray(value.items))throw Error('摘要需返回items');
 const quotes=new Map(stageQuoteCatalog(original).map(q=>[q.id,q]));
 return checkStorySummary({source:{branchId:original.branchId,turn:original.turn,...(original.privatePersonId?{privatePersonId:original.privatePersonId}:{})},items:value.items.map((item:any)=>{
  if(!object(item)||Object.keys(item).some(k=>!['kind','text','quoteId'].includes(k))||!Number.isSafeInteger(item.quoteId)||!quotes.has(item.quoteId))throw Error('摘要引用编号无效');
  const {id,...quote}=quotes.get(item.quoteId)!;return {kind:item.kind,text:item.text,quote};
 })});
}
export function checkStoryStageSummary(value:any):StoryStageSummary {
 // Revising one source may leave a single valid source in a saved stage.
 // New extraction still requires 2–8 originals through checkStageOriginals.
 return checkStage(value,12,false,1);
}
function checkStage(value:any,itemLimit:number,candidates=false,minimumSources=2):StoryStageSummary {
 if(!object(value)||Object.keys(value).some(k=>!['title','sources'].includes(k))||typeof value.title!=='string'||!value.title.trim()||value.title.length>60||!Array.isArray(value.sources)||value.sources.length<minimumSources||value.sources.length>8)throw Error(`阶段记忆需包含标题与${minimumSources}至8段来源`);
 const sources=value.sources.map(candidates?checkStorySummaryCandidates:checkStorySummary) as StorySummary[];
 let prior=0,total=0;const scope=sources[0].source.privatePersonId;
 for(const s of sources){if(s.source.turn<=prior||s.source.privatePersonId!==scope)throw Error('阶段记忆来源重复、乱序或混合交谈范围');prior=s.source.turn;total+=s.items.length;}
 if(total>itemLimit)throw Error(`阶段记忆最多${itemLimit}条`);
 return {title:value.title,sources};
}
export function checkStageOriginals(value:any,beforeTurn:number,revision:number):StorySummaryOriginal[]{
 if(!Array.isArray(value)||value.length<2||value.length>8)throw Error('请选择2至8段同一交谈范围的原文');
 const originals=value.map(v=>checkStorySummaryOriginal(v,beforeTurn,revision));let prior=0;
 for(const s of originals){if(s.turn<=prior||s.privatePersonId!==originals[0].privatePersonId)throw Error('阶段原文重复、乱序或混合交谈范围');prior=s.turn;}
 return originals;
}
export function stageSummaryProposal(value:any,originals:StorySummaryOriginal[]):StoryStageSummary {
 return checkStoryStageSummary(stageSummaryCandidates(value,originals));
}
/** Validated source-bound candidates, not a persistable stage until reduced to twelve. */
export function stageSummaryCandidates(value:any,originals:StorySummaryOriginal[]):StoryStageSummary {
 if(!object(value)||Object.keys(value).some(k=>!['title','sources'].includes(k))||!Array.isArray(value.sources)||value.sources.length!==originals.length)throw Error('阶段记忆必须对应全部所选原文');
 return checkStage({title:value.title,sources:value.sources.map((s:any,index:number)=>{
  const original=originals[index];
  if(!object(s)||Object.keys(s).some(k=>!['turn','items'].includes(k))||s.turn!==original.turn)throw Error('阶段记忆来源回合不一致');
  const quotes=new Map(stageQuoteCatalog(original).map(q=>[q.id,q]));
  if(!Array.isArray(s.items))throw Error('阶段记忆条目必须是数组');
  if(s.items.length<1||s.items.length>12)throw Error(`第${original.turn}回合候选需包含1至12条，实际${s.items.length}条；保留有原文依据的候选及已有隐私标记`);
  return checkStorySummaryCandidates({source:{branchId:original.branchId,turn:original.turn,...(original.privatePersonId?{privatePersonId:original.privatePersonId}:{})},items:s.items.map((item:any)=>{
   if(!object(item)||Object.keys(item).some(k=>!['kind','text','quoteId'].includes(k))||!Number.isSafeInteger(item.quoteId)||!quotes.has(item.quoteId))throw Error('阶段记忆引用编号无效');
   const {id,...quote}=quotes.get(item.quoteId)!;
   return {kind:item.kind,text:item.text,quote};
  })});
 })},96,true);
}
export function selectStageSummaryCandidates(value:any,candidates:StoryStageSummary):StoryStageSummary {
 if(!object(value)||Object.keys(value).some(k=>!['primary','extra'].includes(k))||!Array.isArray(value.primary)||value.primary.length!==candidates.sources.length)throw Error('阶段记忆选择必须覆盖全部来源');
 if(!Array.isArray(value.extra)||value.extra.length>12-candidates.sources.length)throw Error('阶段记忆附加选择超出剩余名额');
 const selected=new Map<number,Set<number>>();
 const choose=(entry:any,expectedTurn?:number)=>{
  if(!object(entry)||Object.keys(entry).some(k=>!['turn','index'].includes(k))||expectedTurn!==undefined&&entry.turn!==expectedTurn)throw Error('阶段记忆选择编号无效');
  const source=candidates.sources.find(s=>s.source.turn===entry.turn);
  if(!source||!Number.isSafeInteger(entry.index)||entry.index<0||entry.index>=source.items.length)throw Error('阶段记忆选择编号无效');
  const indices=selected.get(entry.turn)??new Set<number>();if(indices.has(entry.index))throw Error('阶段记忆选择编号重复');
  indices.add(entry.index);selected.set(entry.turn,indices);
 };
 value.primary.forEach((entry:any,index:number)=>choose(entry,candidates.sources[index].source.turn));
 value.extra.forEach((entry:any)=>choose(entry));
 return checkStoryStageSummary({title:candidates.title,sources:candidates.sources.map(source=>({...source,items:[...selected.get(source.source.turn)!].sort((a,b)=>a-b).map(i=>source.items[i])}))});
}
