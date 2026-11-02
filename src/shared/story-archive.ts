import {jsonEqual} from './json-identity';
import {MAX_STORY_PROSE_LENGTH} from './story-prose';
import {validateStoryHostSource} from './story-source-input';
import {validatePrivateMessages,privateMessageProse,PRIVATE_CONVERSATION_ENDED} from './story-private-messages';
import {partyMessageForTurn,partyMessageMatchesTurn,partyMessages} from './story-party-chat';
import {validatePrivateStoryRoute} from './story-private-route';
import {statementMatchesTurn} from './story-person-knowledge';
import {checkStorySummary,summaryMatchesTurn} from './story-summary';
import {checkStoryStageSummary} from './story-stage-summary';
import type {GameSnapshot} from '../runtime/contracts';
import type {StoryTurn} from '../runtime/story-turns';
import {storyInlineCards,validateStoryInlinePresentation} from './story-inline-cards';

export interface StoryArchiveEntry {branchId:string;revision:number;turn:StoryTurn}
export interface StoryArchiveRecord extends StoryArchiveEntry {id:string;worldId:string;previousId:string|null}
export interface StoryArchivePage {entries:StoryArchiveRecord[];nextId:string|null;headId:string|null}

export function checkedStoryEntry(value:unknown):StoryArchiveEntry {
 const e=value as StoryArchiveEntry;
 if(!e||typeof e!=='object'||typeof e.branchId!=='string'||!e.branchId||e.branchId.length>160||!Number.isSafeInteger(e.revision)||e.revision<0)throw Error('故事历史条目无效');
 const t=e.turn;
 if(t?.continuation!==undefined)throw Error('尚有后续行动的故事不能归档为完成');
 if(t?.battleId!==undefined&&(typeof t.battleId!=='string'||!t.battleId.trim()||t.battleId.length>160||t.privatePersonId!==undefined))throw Error('战斗历史来源无效');
 if(t?.privatePersonId!==undefined&&(typeof t.privatePersonId!=='string'||!t.privatePersonId.trim()||t.privatePersonId.length>160))throw Error('私聊历史对象无效');
 if(!t||!Number.isSafeInteger(t.number)||t.number<1||t.status!=='complete'||typeof t.input!=='string'||!t.input.trim()||t.input.length>8000||typeof t.prose!=='string'||!t.prose.trim()||t.prose.length>MAX_STORY_PROSE_LENGTH||!Array.isArray(t.results)||!t.before||!t.after)throw Error('故事历史缺少完整回合');
 if(t.partyChat!==undefined&&(t.partyChat!==true||t.privatePersonId||t.battleId))throw Error('队伍会话归属无效');
 if(t.privateMessages!==undefined&&(!t.privatePersonId||t.inlinePresentation!==undefined||privateMessageProse(validatePrivateMessages({messages:t.privateMessages},t.prose===PRIVATE_CONVERSATION_ENDED||t.after?.communication?.available===false),t.prose===PRIVATE_CONVERSATION_ENDED)!==t.prose))throw Error('私聊历史短消息不一致');
 validateStoryHostSource(t);validatePrivateStoryRoute(t);const party=partyMessageForTurn(t);if(party)partyMessageMatchesTurn(party,t);
 if(t.inlinePresentation!==undefined)validateStoryInlinePresentation(t.prose,t.inlinePresentation,storyInlineCards(t));
 return structuredClone({branchId:e.branchId,revision:e.revision,turn:t});
}

/** Export/import history is a complete selected timeline, never a clipped event feed. */
export function checkedStoryHistory(snapshot:GameSnapshot,input:unknown):StoryArchiveEntry[] {
 if(!Array.isArray(input))throw Error('故事历史格式无效');
 const entries=input.map(checkedStoryEntry),ledger=(snapshot.state as any)?.扩展?.story;
 for(let i=0;i<entries.length;i++)if(entries[i].turn.number!==i+1)throw Error('故事历史存在缺失或重复回合');
 const active=ledger?.active;
 const expected=active?active.number-(active.status==='complete'?0:1):0;
 if(entries.length!==expected)throw Error('存档缺少对应的完整故事历史');
 if(active?.status==='complete'){
  const last=entries.at(-1)!;
  if(last.branchId!==(ledger.inheritedBranchId??ledger.branchId)||!jsonEqual(last.turn,active))throw Error('故事历史与当前回合不一致');
 }
 if(ledger?.deferredBattle){
  const pending=ledger.deferredBattle.turn,original=entries.find(e=>e.turn.number===pending.number)?.turn;
  const settledSource=(turn:any)=>Object.fromEntries(Object.keys(turn).filter(k=>!['status','prose','inlinePresentation','continuation'].includes(k)).sort().map(k=>[k,turn[k]]));
  if(!original||!jsonEqual(settledSource(pending),settledSource(original)))throw Error('待续战后行动与已保存的开战故事不一致');
 }
 for(const raw of [...(ledger?.summaries??[]),...(ledger?.stageSummaries??[]).flatMap((stage:any)=>checkStoryStageSummary(stage).sources)]){const summary=checkStorySummary(raw),source=entries.find(e=>e.turn.number===summary.source.turn);if(!source)throw Error('摘要缺少原始故事');summaryMatchesTurn(summary,source.turn,source.branchId);}
 for(const person of Object.values((snapshot.state as any).人物?.列表??{}) as any[])for(const record of person.扩展?.听闻记录??[]){
  const original=entries.find(entry=>entry.turn.number===record.source.turn)?.turn??(active?.number===record.source.turn?active:undefined);
  if(!original)throw Error('人物听闻缺少原始故事');statementMatchesTurn(record,original);
 }
 for(const message of partyMessages(snapshot.state)){const original=entries.find(e=>e.turn.number===message.source.turn)?.turn??(active?.number===message.source.turn?active:undefined);if(!original)throw Error('队伍消息缺少原始故事');partyMessageMatchesTurn(message,original);}
 return entries;
}
