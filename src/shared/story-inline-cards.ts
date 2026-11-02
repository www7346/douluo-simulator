import {isPartyTurn} from './story-party-chat';
import {storyBoundBattleView} from './story-bound-battle';
import {storyTurnPeople,storyFirstAppearance} from './story-event-context';
import type {StoryTurn} from '../runtime/story-turns';
import type {StoryWritingFacts} from '../runtime/story-writing-facts';
import type {PortraitPerson} from '../runtime/visual-identity';
import {compileStoryBattleSettlement} from '../runtime/story-battle-settlement';

export interface StoryInlineCard {id:string;kind:'person'|'battle-state'|'battle-action'|'check';title:string;source:{turn:number;step?:number;battleId?:string;sequence?:number;moment:string};data:any}
export interface StoryInlinePresentation {version:1;proseHash:string;placements:{offset:number;cardId:string}[]}
/** The ending card and arena settlement are different frozen moments. Never use today's actor state. */
export function storyInlineBattleSettlement(turn:StoryTurn,card:StoryInlineCard){
 turn=storyBoundBattleView(turn);
 if(card.kind!=='battle-state'||card.source.turn!==turn.number||isPartyTurn(turn))return null;
 const report=turn.results.find(r=>r.status==='succeeded'&&r.step===card.source.step&&r.receipt?.report?.id===card.source.battleId)?.receipt?.report;
 if(!report||card.source.sequence!==(report.actions.at(-1)?.sequence??0)+1)return null;
 return compileStoryBattleSettlement(report);
}
/** Use this appearance's frozen biography, never the person's present-day state. */
export function storyInlinePersonPortrait(turn:StoryTurn,card:StoryInlineCard):PortraitPerson|undefined{
 if(card.kind!=='person'||card.source.turn!==turn.number||isPartyTurn(turn))return;
 const person=storyFirstAppearance(turn,card.data.id,card.source.step)?.person;if(!person)return;
 const recorded=person.characterization?.recorded;
 return {id:person.canonicalId??person.id,name:person.name,kind:person.canonicalId?'character':'resident',
  gender:recorded?.gender,age:recorded?.age,occupation:person.occupation,...(person.visualIdentity?{扩展:structuredClone(person.visualIdentity)}:{})};
}
// A deterministic presentation identity, not a game variable or authentication signature.
function fingerprint(value:unknown){let hash=14695981039346656037n;for(const char of JSON.stringify(value)){hash^=BigInt(char.codePointAt(0)!);hash=BigInt.asUintN(64,hash*1099511628211n);}return hash.toString(36);}
export function storyInlineCards(turn:StoryTurn,facts?:StoryWritingFacts):StoryInlineCard[]{
 turn=storyBoundBattleView(turn);
 if(!turn.before||!turn.after||turn.status==='planning'||isPartyTurn(turn)||!!turn.privateMessages)return [];
 const firstIds=new Set(turn.results.filter(r=>r.status==='succeeded'&&(r.receipt?.type==='character-met'&&r.receipt.metBefore===false||r.receipt?.type==='story-person-created'&&!r.receipt.reused)).map(r=>r.receipt!.personId));
 for(const id of turn.before.pendingPublicIntroductions??[])firstIds.add(id);
 const beforePeople=[...(turn.before.people??[]),...(turn.before.knownPeople??[])];
 const people=storyTurnPeople(turn).map(o=>o.person).filter((p:any)=>p?.id!==turn.after?.player?.id&&(firstIds.has(p.id)||p.encounter&&!beforePeople.find((b:any)=>b.id===p.id)?.encounter)),cards:StoryInlineCard[]=[];
 const add=(card:Omit<StoryInlineCard,'id'>)=>cards.push({...card,id:'c'+fingerprint(card)});
 for(const selected of people){
  const step=turn.results.find(r=>r.status==='succeeded'&&r.receipt?.personId===selected.id&&['character-met','story-person-created'].includes(r.receipt?.type))?.step;
  const appearance=storyFirstAppearance(turn,selected.id,step);if(!appearance)continue;
  const person=appearance.person;
  const data=Object.fromEntries(['id','name','canonicalId','identity','occupation','level','rank','resources','lifeStatus','martialSouls','ownedRings'].filter(k=>person[k]!==undefined).map(k=>[k,structuredClone(person[k])]));
  // Only the display information; ability catalogues and private character records stay out of cards.
  if(data.martialSouls)data.martialSouls=data.martialSouls.map((s:any)=>({id:s.id,name:s.name,active:s.active}));
  if(data.rank)data.rank={name:data.rank.name};
  if(data.ownedRings)data.ownedRings=data.ownedRings.map((r:any)=>({id:r.id,ordinal:r.ordinal,years:r.years,color:r.color,martialSoulId:r.martialSoulId}));
  add({kind:'person',title:person.name,source:{turn:turn.number,...(appearance.source.step===undefined?{}:{step:appearance.source.step}),moment:appearance.source.step===undefined?'首次出场 · 本段结束时已知状态':'首次出场 · 相遇时已知状态'},data});
 }
 for(const result of turn.results){
  const report=result.status==='succeeded'?result.receipt?.report:null;
  if(report&&(!turn.battleId||report.id===turn.battleId)){
   for(const [moment,view,sequence] of [[report.completeFromStart?'交锋开始':'留存记录起点',report.opening,0],['交锋结束（战后恢复前）',report.closing,(report.actions.at(-1)?.sequence??0)+1]] as const){
    if(view)add({kind:'battle-state',title:moment,source:{turn:turn.number,step:result.step,battleId:report.id,sequence,moment},data:{round:view.round,units:structuredClone(view.units)}});
   }
   const battle=facts?.events.find(e=>e.step===result.step)?.facts.battle;
   const detailed=battle?new Set<number>(battle.account.passages.filter((p:any)=>p.kind==='具体经过').flatMap((p:any)=>p.sourceSequences)):null;
   for(const action of report.actions)if(!detailed||detailed.has(action.sequence))add({kind:'battle-action',title:action.summary??`第${action.round}回合的行动`,source:{turn:turn.number,step:result.step,battleId:report.id,sequence:action.sequence,moment:`第${action.round}回合`},data:{round:action.round,sequence:action.sequence,summary:action.summary,judgments:structuredClone(action.judgments??[])}});
  }
  const check=result.receipt?.type==='story-free-action'?result.receipt.check:result.receipt;
  if(['story-attribute-check','story-opposed-check'].includes(check?.type))add({kind:'check',title:check.summary,source:{turn:turn.number,step:result.step,moment:'本次行动判定'},data:{summary:check.summary,reason:check.reason}});
 }
 return cards;
}
export function inlineCardProtocol(cards:StoryInlineCard[]){
 const priority:StoryInlineCard[]=[],add=(c:StoryInlineCard)=>{if(!priority.some(p=>p.id===c.id))priority.push(c);};
 // Keep the endpoint and decisive action available even if the author uses every offered card.
 cards.filter(c=>c.kind==='battle-state'||c.kind==='check').forEach(add);
 for(const battleId of new Set(cards.flatMap(c=>c.source.battleId?[c.source.battleId]:[]))){const last=cards.filter(c=>c.kind==='battle-action'&&c.source.battleId===battleId).sort((a,b)=>b.source.sequence!-a.source.sequence!)[0];if(last)add(last);}
 cards.filter(c=>c.kind==='person').forEach(add);cards.forEach(add);
 // Selection priority is not event order: the endpoint is important, but must be
 // presented after its decisive action in the author's source catalogue.
 const selected=priority.slice(0,6).sort((a,b)=>(a.source.step??-1)-(b.source.step??-1)||(a.source.battleId??'').localeCompare(b.source.battleId??'')||(a.source.sequence??-1)-(b.source.sequence??-1));
 return {placement:'可在相关段落之间单独插入给定marker，最多六张；前端展示已有资料卡，正文继续自然叙述。',items:selected.map(c=>{
  // A display catalogue is not evidence of recovery or battle completion. Keep
  // the saved card identity intact; the author's label only names its endpoint.
  const endpoint=c.kind==='battle-state'&&c.source.sequence!==0;
  const title=endpoint?'交锋记录终点':c.title;
  return {marker:`[[card:${c.id}]]`,type:c.kind,title,source:endpoint?{...c.source,moment:title}:c.source};
 })};
}
export function extractStoryInlineCards(raw:string,cards:StoryInlineCard[]){
 const available=new Map(cards.map(c=>[c.id,c])),seen=new Set<string>(),lastBattle=new Map<string,number>(),placements:StoryInlinePresentation['placements']=[],omitted:{cardId:string;reason:string}[]=[];
 let prose='',end=0;
 for(const match of raw.matchAll(/\[\[card:([^\]\n]*)\]\]/g)){
  prose+=raw.slice(end,match.index);end=match.index+match[0].length;
  const id=match[1],card=available.get(id),lineStart=raw.lastIndexOf('\n',match.index-1)+1,lineEnd=raw.indexOf('\n',end);
  const withoutMarkers=(s:string)=>s.replace(/\[\[card:([^\]\n]*)\]\]/g,'').trim();
  const alone=!prose.length||!withoutMarkers(raw.slice(end))||!withoutMarkers(raw.slice(lineStart,match.index))&&!withoutMarkers(raw.slice(end,lineEnd<0?raw.length:lineEnd));
  const battle=card?.source.battleId,sequence=card?.source.sequence;
  const reason=!card?'来源不属于本段':!alone?'引用不在段落之间':seen.has(id)?'重复引用':placements.length>=6?'超过正文卡片数量':battle&&(sequence??-1)<(lastBattle.get(battle)??-1)?'战斗时序倒退':null;
  if(reason){omitted.push({cardId:id,reason});continue;}
  placements.push({offset:prose.length,cardId:id});seen.add(id);if(battle)lastBattle.set(battle,sequence!);
 }
 prose+=raw.slice(end);
 return {prose,presentation:placements.length?{version:1 as const,proseHash:fingerprint(prose),placements}:undefined,omitted};
}
export function validateStoryInlinePresentation(prose:string,value:unknown,cards:StoryInlineCard[]):asserts value is StoryInlinePresentation|undefined{
 const presentation=value as StoryInlinePresentation|undefined;
 if(presentation===undefined)return;
 if(!presentation||Object.keys(presentation).some(k=>!['version','proseHash','placements'].includes(k))||presentation.version!==1||presentation.proseHash!==fingerprint(prose)||!Array.isArray(presentation.placements)||presentation.placements.length>6)throw Error('正文卡片与这版文字不一致');
 const seen=new Set<string>(),available=new Map(cards.map(c=>[c.id,c])),lastBattle=new Map<string,number>();let previous=-1;
 for(const item of presentation.placements){
  if(!item||Object.keys(item).some(k=>!['offset','cardId'].includes(k)))throw Error('正文卡片引用无效');
  const card=available.get(item.cardId),offset=item.offset;
  const atBoundary=offset===0||!prose.slice(offset).trim()||!prose.slice(prose.lastIndexOf('\n',offset-1)+1,offset).trim()&&!prose.slice(offset,prose.indexOf('\n',offset)<0?prose.length:prose.indexOf('\n',offset)).trim();
  if(!card||seen.has(item.cardId)||!Number.isInteger(offset)||offset<previous||offset<0||offset>prose.length||!atBoundary)throw Error('正文卡片位置或来源无效');
  if(card.source.battleId){const key=card.source.battleId,seq=card.source.sequence!;if(seq<(lastBattle.get(key)??-1))throw Error('正文卡片战斗时序倒退');lastBattle.set(key,seq);}
  seen.add(item.cardId);previous=offset;
 }
}
/** First appearances and unplaced whole-battle endpoints have known display boundaries.
 * Preserve author placements; never guess an internal prose anchor or alter its text.
 */
export function completeStoryInlinePresentation(prose:string,value:StoryInlinePresentation|undefined,cards:StoryInlineCard[]):StoryInlinePresentation|undefined{
 validateStoryInlinePresentation(prose,value,cards);
 const placements=structuredClone(value?.placements??[]),seen=new Set(placements.map(p=>p.cardId));
 const paragraph=prose.match(/\r?\n[ \t]*\r?\n/),offset=paragraph?paragraph.index!+prose.slice(paragraph.index).indexOf('\n')+1:0;
 for(const card of cards.filter(c=>c.kind==='person'))if(!seen.has(card.id)){
  if(placements.length>=6){let optional=placements.length-1;while(optional>=0&&cards.find(c=>c.id===placements[optional].cardId)?.kind==='person')optional--;if(optional<0)break;placements.splice(optional,1);}
  placements.push({offset,cardId:card.id});seen.add(card.id);
 }
 for(const battleId of new Set(cards.filter(c=>c.kind==='battle-state').map(c=>c.source.battleId))){
  if(placements.some(p=>cards.find(c=>c.id===p.cardId)?.source.battleId===battleId))continue;
  const states=cards.filter(c=>c.kind==='battle-state'&&c.source.battleId===battleId).sort((a,b)=>a.source.sequence!-b.source.sequence!);
  if(states.length>1&&placements.length<5){placements.push({offset:0,cardId:states[0].id});seen.add(states[0].id);}
  const closing=states.at(-1)!;if(placements.length<6&&!seen.has(closing.id)){placements.push({offset:prose.length,cardId:closing.id});seen.add(closing.id);}
 }
 if(!placements.length)return value;
 placements.sort((a,b)=>a.offset-b.offset);
 const completed={version:1 as const,proseHash:fingerprint(prose),placements};validateStoryInlinePresentation(prose,completed,cards);return completed;
}
/** Restore only validated references before extending the same prose; rewrites supply a new set. */
export function inlineStoryWithMarkers(turn:StoryTurn,cards=storyInlineCards(turn)){
 const prose=turn.prose??'';validateStoryInlinePresentation(prose,turn.inlinePresentation,cards);let result=prose;
 for(const p of [...(turn.inlinePresentation?.placements??[])].reverse())result=result.slice(0,p.offset)+`[[card:${p.cardId}]]`+result.slice(p.offset);
 return result;
}
