import {MAX_STORY_PROSE_LENGTH} from './story-prose';
import {storySourceInput} from './story-source-input';
export {MEMORY_PRIVACY_GUIDANCE,STORY_SUMMARY_GUIDANCE,HOST_PRIVATE_MEMORY_GUIDANCE} from './model-prompt-defaults';
import {storySearchTerms} from './story-search';
import {remembersStoryTurn} from './cognition-view';
import type {StoryTurn} from '../runtime/story-turns';
export interface StorySummary {
 source:{branchId:string;turn:number;privatePersonId?:string};
 items:{kind:'event'|'statement'|'thought'|'unobserved'|'uncertain';text:string;quote:{field:'input'|'prose';start:number;end:number;text:string}}[];
}
/** Model context uses source excerpts; generated paraphrases remain storage/UI/search metadata. */
export interface StoryMemoryExcerpt {
 source:StorySummary['source'];
 items:{kind:StorySummary['items'][number]['kind'];quote:StorySummary['items'][number]['quote']}[];
}
function memoryExcerpt(summary:StorySummary):StoryMemoryExcerpt{
 return structuredClone({source:summary.source,items:summary.items.map(({kind,quote})=>({kind,quote}))});
}
export const isPrivateMemoryKind=(kind:StorySummary['items'][number]['kind'])=>kind==='thought'||kind==='unobserved';

const object=(v:any)=>v&&typeof v==='object'&&!Array.isArray(v);
/** Stage memories remain directly attributed to original turns; individual revisions take precedence. */
export function storySummaryPool(state:any):StorySummary[]{
 const ledger=state.扩展?.story,pool=new Map<number,StorySummary>();
 for(const stage of ledger?.stageSummaries??[])for(const summary of stage.sources)pool.set(summary.source.turn,summary);
 for(const summary of ledger?.summaries??[])pool.set(summary.source.turn,summary);
 const groupTurns=new Set((ledger?.partyMessages??[]).map((m:any)=>m.source.turn));
 return [...pool.values()].filter(summary=>!groupTurns.has(summary.source.turn));
}
export function checkStorySummary(value:any):StorySummary{return checkSummaryItems(value,6);}
/** Temporary source-bound candidates; never a persistable summary. */
export function checkStorySummaryCandidates(value:any):StorySummary{return checkSummaryItems(value,12);}
function checkSummaryItems(value:any,maxItems:number):StorySummary{
 const s=value?.source;
 if(!object(value)||Object.keys(value).some(k=>!['source','items'].includes(k))||!object(s)||Object.keys(s).some(k=>!['branchId','turn','privatePersonId'].includes(k))||typeof s.branchId!=='string'||!s.branchId||s.branchId.length>160||!Number.isSafeInteger(s.turn)||s.turn<1||s.privatePersonId!==undefined&&(typeof s.privatePersonId!=='string'||!s.privatePersonId||s.privatePersonId.length>160))throw Error('摘要缺少有效来源');
 if(!Array.isArray(value.items)||!value.items.length||value.items.length>maxItems)throw Error(`摘要需包含1至${maxItems}条记忆`);
 for(const item of value.items){const q=item?.quote;
  if(!object(item)||Object.keys(item).some(k=>!['kind','text','quote'].includes(k))||!['event','statement','thought','unobserved','uncertain'].includes(item.kind)||typeof item.text!=='string'||!item.text.trim()||item.text.length>200)throw Error('摘要条目无效');
  if(!object(q)||Object.keys(q).some(k=>!['field','start','end','text'].includes(k))||!['input','prose'].includes(q.field)||!Number.isSafeInteger(q.start)||q.start<0||!Number.isSafeInteger(q.end)||q.end<=q.start||q.end>(q.field==='input'?8000:MAX_STORY_PROSE_LENGTH)||typeof q.text!=='string'||!q.text.trim()||q.text.length>240||q.text.length!==q.end-q.start)throw Error('摘要原文引用无效');
 }
 return structuredClone(value);
}
export function summaryMatchesTurn(summary:StorySummary,turn:StoryTurn,branchId:string){
 if(summary.source.branchId!==branchId||summary.source.turn!==turn.number||summary.source.privatePersonId!==turn.privatePersonId||turn.status!=='complete')throw Error('摘要与原始回合或交谈范围不一致');
 for(const item of summary.items)if((item.quote.field==='input'?storySourceInput(turn):turn[item.quote.field])?.slice(item.quote.start,item.quote.end)!==item.quote.text)throw Error('摘要引用与原文不一致');
}
export function summaryProposal(value:any,turn:StoryTurn,branchId:string):StorySummary{
 if(!object(value)||Object.keys(value).some(k=>k!=='items')||!Array.isArray(value.items)||value.items.length>6)throw Error('摘要需返回items');
 const summary=checkStorySummary({source:{branchId,turn:turn.number,...(turn.privatePersonId?{privatePersonId:turn.privatePersonId}:{})},items:value.items.map((item:any)=>{
  if(!object(item)||Object.keys(item).some(k=>!['kind','text','field','quote'].includes(k))||!['input','prose'].includes(item.field)||typeof item.quote!=='string'||!item.quote.trim())throw Error('摘要需给出完整原文引句');
  const original=(item.field==='input'?storySourceInput(turn):turn[item.field as 'input'|'prose'])??'',start=original.indexOf(item.quote);
  if(start<0||original.indexOf(item.quote,start+1)>=0)throw Error('摘要引句不存在或位置不唯一，请补足上下文');
  return {kind:item.kind,text:item.text,quote:{field:item.field,start,end:start+item.quote.length,text:item.quote}};
 })});summaryMatchesTurn(summary,turn,branchId);return summary;
}
/** Filter privacy and original-message coverage before ranking; saved summaries are never rewritten. */
export function selectStorySummaries(state:any,beforeTurn:number,privatePersonId?:string,excluded:number[]=[],query=''):StoryMemoryExcerpt[]{
 const terms=new Set(storySearchTerms(query).map(item=>item.term));
 const candidates=storySummaryPool(state).filter((s:StorySummary)=>s.source.turn<beforeTurn&&s.source.privatePersonId===privatePersonId&&!excluded.includes(s.source.turn));
 const ranked=candidates.map(summary=>{
  const matched=new Set<string>();
  for(const item of summary.items)for(const text of [item.text,item.quote.text])for(const term of storySearchTerms(text))if(terms.has(term.term))matched.add(term.term);
  return {summary,score:matched.size};
 });
 ranked.sort((a,b)=>b.score-a.score||b.summary.source.turn-a.summary.source.turn);
 return ranked.slice(0,4).map(item=>item.summary).sort((a,b)=>a.source.turn-b.source.turn).map(memoryExcerpt);
}

/** Public-story host context only. This must never be reused as an NPC knowledge projection. */
export function selectHostPrivateSummaries(state:any,beforeTurn:number,query:string,excluded:number[]=[]):StoryMemoryExcerpt[]{
 const terms=new Set(storySearchTerms(query).map(t=>t.term)),normalized=query.normalize('NFKC');
 const candidates=storySummaryPool(state).flatMap(summary=>{
  const personId=summary.source.privatePersonId,person=personId&&state.人物?.列表?.[personId];
  if(!person||summary.source.turn>=beforeTurn||excluded.includes(summary.source.turn))return [];
  const named=typeof person.name==='string'&&person.name.length>=2&&normalized.includes(person.name.normalize('NFKC'));
  const matched=new Set<string>();
  const items=summary.items.filter(item=>{
   const hits=storySearchTerms(item.text+' '+item.quote.text).filter(t=>terms.has(t.term));hits.forEach(t=>matched.add(t.term));
   return named||hits.length>0;
  });
  return items.length?[{summary:{source:summary.source,items},score:matched.size+(named?4:0)}]:[];
 });
 candidates.sort((a,b)=>b.score-a.score||b.summary.source.turn-a.summary.source.turn);
 return candidates.slice(0,4).map(c=>c.summary).sort((a,b)=>a.source.turn-b.source.turn).map(memoryExcerpt);
}

/** All still-valid annotations contribute: a newer summary cannot expose an older private annotation. */
export function personPrivateQuotes(state:any,personId:string,source:{branchId:string;turn:number}){
 const ledger=state.扩展?.story;
 const summaries:StorySummary[]=[...(ledger?.summaries??[]),...(ledger?.stageSummaries??[]).flatMap((stage:any)=>stage.sources)];
 return summaries.filter(s=>s.source.privatePersonId===personId&&s.source.branchId===source.branchId&&s.source.turn===source.turn)
  .flatMap(s=>s.items.filter(item=>isPrivateMemoryKind(item.kind)).map(item=>item.quote));
}
export function overlapsStoryQuote(a:{field:string;start:number;end:number},b:{field:string;start:number;end:number}){
 return a.field===b.field&&a.start<b.end&&b.start<a.end;
}

/** Input visibility comes from actual delivery records, not a model's memory label. */
export function personDeliveredInputQuotes(state:any,personId:string,source:{branchId:string;turn:number}):StorySummary['items'][number]['quote'][] {
 const person=state.人物?.列表?.[personId];
 return [...(person?.扩展?.听闻记录??[]),...(person?.扩展?.交谈意图??[])]
  .filter(c=>c.source?.branchId===source.branchId&&c.source.turn===source.turn&&c.listenerId===personId&&c.speakerId===state.角色?.主控单位ID)
  .map(c=>({field:'input',start:c.source.inputStart,end:c.source.inputEnd,text:c.text??c.intent}));
}

/** NPC responses use their own conversation only; remove classified private content before ranking and budgeting. */
export function selectPersonStorySummaries(state:any,beforeTurn:number,personId:string,excluded:number[]=[],query=''):StoryMemoryExcerpt[]{
 const summaries=storySummaryPool(state)
  .filter((s:StorySummary)=>s.source.privatePersonId===personId&&remembersStoryTurn(state,personId,s.source.turn))
  .map((s:StorySummary)=>{const hidden=personPrivateQuotes(state,personId,s.source),delivered=personDeliveredInputQuotes(state,personId,s.source);return {...s,items:s.items.filter(item=>{
   const q=item.quote;
   return !isPrivateMemoryKind(item.kind)&&!hidden.some(h=>overlapsStoryQuote(h,q))&&(q.field==='prose'||delivered.some(d=>q.start>=d.start&&q.end<=d.end&&q.text===d.text.slice(q.start-d.start,q.end-d.start)));
  })};})
  .filter((s:StorySummary)=>s.items.length);
 return selectStorySummaries({扩展:{story:{summaries}}},beforeTurn,personId,excluded,query);
}

/** Re-summarizing must not erase existing privacy annotations for the same original. */
export function checkPrivateMemoryRetention(previous:StorySummary[],next:StorySummary[]){
 for(const old of previous)for(const item of old.items){
  if(!isPrivateMemoryKind(item.kind))continue;
  const replacements=next.filter(s=>s.source.branchId===old.source.branchId&&s.source.turn===old.source.turn&&s.source.privatePersonId===old.source.privatePersonId);
  if(!replacements.length)continue;
  const ranges=replacements.flatMap(s=>s.items.filter(i=>isPrivateMemoryKind(i.kind)&&i.quote.field===item.quote.field).map(i=>i.quote)).sort((a,b)=>a.start-b.start);
  let covered=item.quote.start;
  for(const range of ranges){if(range.start>covered)break;if(range.end>covered)covered=range.end;}
  if(covered<item.quote.end)throw Error('重新整理不能丢失已有内心来源标记或未感知来源标记，请用thought或unobserved保留隐私；旧记忆尚未更改');
 }
}
