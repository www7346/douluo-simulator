import {MAX_STORY_PROSE_LENGTH} from './story-prose';
import {storySourceInput} from './story-source-input';
export {STORY_RECALL_GUIDANCE} from './model-prompt-defaults';
import {dialogueParticipants,turnDialogue,type DialogueMemory} from './story-dialogue-memory';
import {isPartyTurn} from './story-party-chat';
import {remembersStoryTurn} from './cognition-view';
import {storyPersonObservations} from './story-event-context';
import {personPrivateQuotes,personDeliveredInputQuotes,overlapsStoryQuote,storySummaryPool,isPrivateMemoryKind} from './story-summary';
import {storySearchTerms as terms} from './story-search';
import type {StoryArchivePage,StoryArchiveRecord} from './story-archive';

export interface StoryRecall {
 source:{id:string;branchId:string;revision:number;turn:number};
 privatePersonId?:string;
 passages:{field:'input'|'prose';start:number;end:number;text:string}[];
 partial:boolean;
}
export interface StoryRecent {number:number;input:string;prose:string;privatePersonId?:string}
const ORIGIN_OPERATORS=new Set(['最初','最早','首次','第一','一次']);
function mentionedReceiptPeople(entry:StoryArchiveRecord,queryText:string){
 const names=new Map<string,string>();
 for(const {person} of storyPersonObservations(entry.turn)){
  if(typeof person?.id==='string'&&typeof person.name==='string'&&person.name.length>=2&&queryText.normalize('NFKC').includes(person.name.normalize('NFKC')))names.set(person.id,person.name);
 }
 if(!names.size)return 0;
 const found=new Set<string>();
 // The private conversation itself establishes its participant, even without a mechanical action receipt.
 if(entry.turn.privatePersonId&&names.has(entry.turn.privatePersonId))found.add(entry.turn.privatePersonId);
 const visit=(value:unknown)=>{
  if(typeof value==='string'){if(names.has(value))found.add(value);}
  else if(Array.isArray(value))value.forEach(visit);
  else if(value&&typeof value==='object')Object.values(value).forEach(visit);
 };
 // A person merely standing nearby or named in an unexecuted proposal is not an interaction.
 // A rejected proposal may have a committed response receipt even though its result failed.
 for(const result of entry.turn.results)if(['succeeded','failed'].includes(result.status)&&result.receipt)visit(result.receipt);
 return found.size;
}
function candidate(entry:StoryArchiveRecord,query:Set<string>,queryText:string){
 const people=mentionedReceiptPeople(entry,queryText);
 const matched=new Set<string>(),inputMatched=new Set<string>(),passages:StoryRecall['passages']=[];
 for(const field of ['input','prose'] as const){
  const text=(field==='input'?storySourceInput(entry.turn):entry.turn[field])??'',hits=terms(text).filter(h=>query.has(h.term));
  for(const hit of hits)matched.add(hit.term);
  if(field==='input')for(const hit of hits)if(!ORIGIN_OPERATORS.has(hit.term))inputMatched.add(hit.term);
  if(!hits.length)continue;
  // Pick a dense verbatim window, retaining offsets into the original message.
  let best=hits[0].at,score=-1,left=0;
  for(let right=0;right<hits.length;right++){
   while(hits[right].at-hits[left].at>400)left++;
   if(right-left>score){score=right-left;best=hits[left].at;}
  }
  let start=Math.max(0,best-100),end=Math.min(text.length,start+600);
  if(start>0&&/[\uDC00-\uDFFF]/.test(text[start]))start--;
  if(end<text.length&&/[\uDC00-\uDFFF]/.test(text[end]))end--;
  passages.push({field,start,end,text:text.slice(start,end)});
 }
 if(!matched.size&&!people)return null;
 if(people&&!passages.length){
  for(const field of ['input','prose'] as const){const text=(field==='input'?storySourceInput(entry.turn):entry.turn[field])??'';let end=Math.min(600,text.length);if(end<text.length&&/[\uDC00-\uDFFF]/.test(text[end]))end--;if(end)passages.push({field,start:0,end,text:text.slice(0,end)});}
 }
 // When the clue was spoken only in the input, retain the beginning of the answer too.
 if(!passages.some(p=>p.field==='prose')&&entry.turn.prose){let end=Math.min(600,entry.turn.prose.length);if(end<entry.turn.prose.length&&/[\uDC00-\uDFFF]/.test(entry.turn.prose[end]))end--;const text=entry.turn.prose.slice(0,end);passages.push({field:'prose',start:0,end,text});}
 const recall:StoryRecall={source:{id:entry.id,branchId:entry.branchId,revision:entry.revision,turn:entry.turn.number},
  ...(entry.turn.privatePersonId?{privatePersonId:entry.turn.privatePersonId}:{}),passages,
  partial:passages.reduce((n,p)=>n+p.text.length,0)<storySourceInput(entry.turn).length+(entry.turn.prose?.length??0)};
 return {recall,score:matched.size+people*4,inputMatches:inputMatched.size};
}

/** Read only the selected archive chain. No cache can outlive a rewind or cross worlds. */
export async function readStoryContext(readPage:(nextId?:string)=>Promise<StoryArchivePage>,options:{query:string;beforeTurn:number;privatePersonId?:string;recentLimit?:number;includeHostPrivate?:boolean;dialoguePersonId?:string}){
 const history:StoryRecent[]=[],ranked:{recall:StoryRecall;score:number}[]=[],query=new Set(terms(options.query).map(t=>t.term));
 const privateRanked:{recall:StoryRecall;score:number}[]=[],includePrivate=!!options.includeHostPrivate&&!options.privatePersonId;
 const seeksOrigin=/(?:最初|最早|首次|第一次)/u.test(options.query);
 const dialogue:{record:DialogueMemory;score:number}[]=[];
 let earliestInput:NonNullable<ReturnType<typeof candidate>>|undefined;
 const seen=new Set<string>(),cursors=new Set<string>();let nextId:string|undefined,prior=options.beforeTurn,scanned=0,matched=0,worldId:string|undefined;
 do{
  if(nextId){if(cursors.has(nextId))throw Error('记忆来源的分页发生循环');cursors.add(nextId);}
  const page=await readPage(nextId);
  for(const entry of page.entries){
   worldId??=entry.worldId;if(entry.worldId!==worldId)throw Error('记忆来源不能混用不同世界');
   if(seen.has(entry.id)||entry.turn.number>=prior)throw Error('记忆来源的故事顺序不完整');seen.add(entry.id);prior=entry.turn.number;scanned++;
   if(isPartyTurn(entry.turn))continue;
   const audience=dialogueParticipants(entry.turn);
   for(const id of audience){
    const recipient=options.privatePersonId??options.dialoguePersonId;
    if(recipient?recipient!==id:!entry.turn.privatePersonId)continue;
    const named=!recipient&&storyPersonObservations(entry.turn).some(({person})=>person?.id===id&&person.name&&options.query.includes(person.name));
    if(!recipient&&!named)continue;
    const record=turnDialogue(entry.turn,entry.branchId,id);
    if(!record)continue;
    const hits=new Set(record.speech.flatMap(s=>terms(s.text).filter(t=>query.has(t.term)).map(t=>t.term)));
    dialogue.push({record,score:hits.size});
    dialogue.sort((a,b)=>b.score-a.score||b.record.turn-a.record.turn);dialogue.splice(4);
   }
   if(entry.turn.privatePersonId!==options.privatePersonId){
    if(includePrivate&&entry.turn.privatePersonId){const hit=candidate(entry,query,options.query);if(hit){privateRanked.push(hit);privateRanked.sort((a,b)=>b.score-a.score||b.recall.source.turn-a.recall.source.turn);privateRanked.splice(4);}}
    continue;
   }
   if(history.length<(options.recentLimit??6)){
    history.push({number:entry.turn.number,input:storySourceInput(entry.turn),prose:entry.turn.prose??'',...(entry.turn.privatePersonId?{privatePersonId:entry.turn.privatePersonId}:{})});continue;
   }
   const hit=candidate(entry,query,options.query);if(!hit)continue;matched++;
   // A first-occurrence query keeps one original-input match. Repeated later prose
   // otherwise crowds the actual introduction out of the four bounded excerpts.
   if(seeksOrigin&&hit.inputMatches&&(!earliestInput||hit.recall.source.turn<earliestInput.recall.source.turn))earliestInput=hit;
   ranked.push(hit);ranked.sort((a,b)=>b.score-a.score||b.recall.source.turn-a.recall.source.turn);ranked.splice(4);
  }
  nextId=page.nextId??undefined;
 }while(nextId);
 if(earliestInput&&!ranked.some(r=>r.recall.source.id===earliestInput!.recall.source.id)){ranked.splice(3);ranked.push(earliestInput);}
 const recall=ranked.map(r=>r.recall).sort((a,b)=>a.source.turn-b.source.turn);
 return {history:history.reverse(),recall,dialogue:dialogue.map(d=>d.record).reverse(),...(includePrivate?{hostPrivateRecall:privateRanked.map(r=>r.recall).sort((a,b)=>a.source.turn-b.source.turn)}:{}),recallSelection:{scanned,matched,selected:recall.length,characters:recall.reduce((n,r)=>n+r.passages.reduce((m,p)=>m+p.text.length,0),0),method:'entity-and-lexical-original-excerpts'}};
}

/** A separate host channel, not permission to mix private excerpts into ordinary/NPC history. */
export function checkedHostPrivateRecall(state:any,value:unknown,beforeTurn:number):StoryRecall[]{
 if(value===undefined)return [];
 if(!Array.isArray(value)||value.length>4)throw Error('主持私聊原文最多选择四段');
 const ids=new Set<string>(),turns=new Set<number>();
 return value.map(r=>{
  if(typeof r?.privatePersonId!=='string'||!state.人物?.列表?.[r.privatePersonId]||r.privatePersonId===state.角色?.主控单位ID)throw Error('主持私聊原文缺少有效参与者');
  const checked=checkedStoryRecall([r],beforeTurn,r.privatePersonId)[0];
  if(ids.has(checked.source.id)||turns.has(checked.source.turn))throw Error('主持私聊原文来源重复');
  ids.add(checked.source.id);turns.add(checked.source.turn);return checked;
 });
}

/** External history is narrative context, never an authority to settle a game action. */
export function checkedStoryRecall(value:unknown,beforeTurn:number,privatePersonId?:string,recentNumbers:number[]=[]):StoryRecall[]{
 if(value===undefined)return [];
 if(!Array.isArray(value)||value.length>4)throw Error('历史记忆最多选择四段');
 const ids=new Set<string>(),turns=new Set<number>();let characters=0;
 return value.map((r:any)=>{
  const source=r?.source;
  if(!source||typeof source.id!=='string'||!source.id||source.id.length>500||typeof source.branchId!=='string'||!source.branchId||source.branchId.length>160||!Number.isSafeInteger(source.revision)||source.revision<0||!Number.isSafeInteger(source.turn)||source.turn<1||source.turn>=beforeTurn||ids.has(source.id)||turns.has(source.turn)||recentNumbers.includes(source.turn))throw Error('历史记忆缺少有效且不重复的来源');
  if(r.privatePersonId!==privatePersonId)throw Error('历史记忆不属于当前交谈范围');
  if(typeof r.partial!=='boolean'||!Array.isArray(r.passages)||!r.passages.length||r.passages.length>2)throw Error('历史记忆原文片段无效');
  const fields=new Set<string>();
  const passages=r.passages.map((p:any)=>{
   if(!['input','prose'].includes(p?.field)||fields.has(p.field)||!Number.isSafeInteger(p.start)||p.start<0||!Number.isSafeInteger(p.end)||p.end<=p.start||p.end>(p.field==='input'?8000:MAX_STORY_PROSE_LENGTH)||typeof p.text!=='string'||p.text.length>601||p.text.length!==p.end-p.start)throw Error('历史记忆原文位置无效');
   fields.add(p.field);characters+=p.text.length;return {field:p.field,start:p.start,end:p.end,text:p.text};
  });
  if(characters>4808)throw Error('历史记忆超过本次原文摘录预算');ids.add(source.id);turns.add(source.turn);
  return {source:{id:source.id,branchId:source.branchId,revision:source.revision,turn:source.turn},...(privatePersonId?{privatePersonId}:{}),passages,partial:r.partial};
 });
}

/** NPC-only projection; raw neighbouring prose is not permission to disclose it. */
export function personStoryRecall(state:any,personId:string,recall:StoryRecall[]):StoryRecall[]{
 return recall.filter(r=>r.privatePersonId===personId&&remembersStoryTurn(state,personId,r.source.turn)).flatMap(r=>{
  const sameSource=(s:any)=>s?.branchId===r.source.branchId&&s.turn===r.source.turn;
  const annotated=storySummaryPool(state).filter(s=>s.source.privatePersonId===personId&&sameSource(s.source))
   .flatMap(s=>s.items.filter(i=>i.quote.field==='prose'&&!isPrivateMemoryKind(i.kind)).map(i=>i.quote));
  const delivered=personDeliveredInputQuotes(state,personId,r.source);
  const allowed=[...annotated,...delivered],privateQuotes=personPrivateQuotes(state,personId,r.source);
  const passages=r.passages.flatMap(p=>{
   const ranges=allowed.filter(q=>overlapsStoryQuote(p,q)).flatMap(q=>{
    const start=Math.max(p.start,q.start),end=Math.min(p.end,q.end),text=p.text.slice(start-p.start,end-p.start);
    return text===q.text.slice(start-q.start,end-q.start)?[{...p,start,end,text}]:[];
   }).sort((a,b)=>a.start-b.start||a.end-b.end);
   let fragments:typeof ranges=[];
   for(const range of ranges){const last=fragments.at(-1);
    if(last&&range.start<=last.end){last.end=Math.max(last.end,range.end);last.text=p.text.slice(last.start-p.start,last.end-p.start);}
    else fragments.push({...range});
   }
   for(const hidden of privateQuotes){
    fragments=fragments.flatMap(fragment=>{
     if(!overlapsStoryQuote(fragment,hidden))return [fragment];
     const pieces:typeof fragments=[];
     if(fragment.start<hidden.start)pieces.push({...fragment,end:hidden.start,text:fragment.text.slice(0,hidden.start-fragment.start)});
     if(fragment.end>hidden.end)pieces.push({...fragment,start:hidden.end,text:fragment.text.slice(hidden.end-fragment.start)});
     return pieces;
    });
   }
   return fragments.filter(fragment=>fragment.text.trim());
  });
  const removed=passages.reduce((n,p)=>n+p.text.length,0)<r.passages.reduce((n,p)=>n+p.text.length,0);
  return passages.length?[{...structuredClone(r),passages,partial:r.partial||removed}]:[];
 });
}
