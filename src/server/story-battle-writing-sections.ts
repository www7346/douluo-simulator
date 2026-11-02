import {deriveStoryWritingSection,type StoryWritingPackage} from './story-writing-package';
import type {StoryInlineCard} from '../shared/story-inline-cards';
import {storyBattleCheckpointSummary,storyBattleConclusion} from '../runtime/story-battle-conclusion';
import {storyBattleWritingReference} from './story-battle-writing-reference';
import {storyWritingPersonReferences,selectStoryPersonHistories} from '../runtime/story-writing-person-scope';
import {storyBattleEventUnits} from '../runtime/story-battle-event-units';

export interface BattleWritingBoundary {
 firstPassage:number;lastPassage:number;firstPhase:number;lastPhase:number;
 firstSequence:number;lastSequence:number;
}
export interface PreviousWritingSection {sourceSectionId:string;start:number;end:number;totalCharacters:number;text:string;purpose?:string}
/** Adjacent prose is a sourced excerpt. Full preceding sections stay in progress;
 * authoritative continuity comes from the recorded checkpoints and participants. */
export function previousWritingSection(sourceSectionId:string,prose:string,lastUnitStart=0):PreviousWritingSection{
 // Only the adjacent natural paragraph supplies voice. Actual continuity is
 // already supplied by writingInterval's recorded opening/closing checkpoints.
 const paragraphs=[...prose.matchAll(/[^\r\n]+(?:\r?\n(?!\r?\n)[^\r\n]+)*/g)];
 let start=Math.max(lastUnitStart,paragraphs.at(-1)?.index??0,prose.length-600);
 if(start&&/[\uDC00-\uDFFF]/.test(prose[start]))start++;
 return {sourceSectionId,start,end:prose.length,totalCharacters:prose.length,text:prose.slice(start),purpose:'相邻小说的语气衔接；本段事件承接记录中的实际检查点'};
}
/** Local preflight placeholder only; never send synthetic prose to the model. */
export const previousWritingSectionReserve=():PreviousWritingSection=>({sourceSectionId:'f'.repeat(64),start:24000,end:24000,totalCharacters:24000,text:'文'.repeat(600),purpose:'相邻小说的语气衔接；本段事件承接记录中的实际检查点'});
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);

/** Intersect actual phase endpoints with complete account paragraphs. Never split a
 * compiled exchange or invent an intermediate checkpoint from the final state. */
export function storyBattleWritingBoundaries(source:StoryWritingPackage){
 if(source.origin.writingSection)throw Error('不能再次拆分已选择的写作阶段');
 const eventIndex=source.facts.events.findIndex(e=>e.facts.battle?.id===source.origin.battleId);
 if(eventIndex<0)return null;
 const event=source.facts.events[eventIndex],battle=event.facts.battle;
 if(battle.status!=='已结束')return null;
 const evidence=source.battleSources.find(b=>b.step===event.step&&b.battleId===battle.id);
 if(!evidence)throw Error('战斗阶段缺少完整来源');
 const passages=battle.account.passages,phases=evidence.process.phases;
 const sequences=evidence.actions.map((a:any)=>a.sequence);
 if(!same(passages.flatMap((p:any)=>p.sourceSequences),sequences)||!same(phases.flatMap((p:any)=>p.sourceSequences),sequences))throw Error('战斗阶段与经过未覆盖同一批实际行动');
 const boundaries:BattleWritingBoundary[]=[];
 let firstPassage=0,firstPhase=0;
 for(const [lastPassage,passage] of passages.entries()){
  const end=passage.sourceSequences.at(-1),lastPhase=phases.findIndex((phase:any)=>phase.actionRange.last===end);
  if(lastPhase<0)continue;
  const sectionSequences=passages.slice(firstPassage,lastPassage+1).flatMap((p:any)=>p.sourceSequences);
  if(!same(sectionSequences,phases.slice(firstPhase,lastPhase+1).flatMap((p:any)=>p.sourceSequences)))throw Error('写作阶段边界与实际检查点不一致');
  boundaries.push({firstPassage,lastPassage,firstPhase,lastPhase,firstSequence:sectionSequences[0],lastSequence:end});
  firstPassage=lastPassage+1;firstPhase=lastPhase+1;
 }
 if(firstPassage!==passages.length||firstPhase!==phases.length)throw Error('战斗结尾没有完整写作边界');
 return {eventIndex,battle,evidence,boundaries};
}

export function selectStoryBattleWritingSection(source:StoryWritingPackage,firstBoundary:number,lastBoundary:number){
 const reading=storyBattleWritingBoundaries(source);
 if(!reading||!Number.isInteger(firstBoundary)||!Number.isInteger(lastBoundary)||firstBoundary<0||lastBoundary<firstBoundary||lastBoundary>=reading.boundaries.length)throw Error('战报写作阶段范围无效');
 const {eventIndex,evidence,boundaries}=reading,first=boundaries[firstBoundary],last=boundaries[lastBoundary];
 const includesOpening=firstBoundary===0,includesEnding=lastBoundary===boundaries.length-1;
 const facts=structuredClone(source.facts),event=facts.events[eventIndex],battle=event.facts.battle;
 event.facts.wholeEventStatement=event.statement;
 const selected=new Set<number>(evidence.actions.filter((a:any)=>a.sequence>=first.firstSequence&&a.sequence<=last.lastSequence).map((a:any)=>a.sequence));
 battle.account.passages=battle.account.passages.slice(first.firstPassage,last.lastPassage+1);
 battle.account.scope='本次写作的连续交锋阶段，起止以writingInterval为准；普通交锋为标明区间内的分组汇总，各组回合范围可以重叠，来源编号与资源历程保留实际顺序，末次交锋单列。';
 battle.actions=battle.actions.filter((a:any)=>(a.sourceSequences??[a.sequence]).some((n:number)=>selected.has(n)));
 if(!same(battle.actions.flatMap((a:any)=>a.sourceSequences??[a.sequence]),[...selected]))throw Error('写作边界截断了一个完整动作记录');
 battle.phases=battle.phases.slice(first.firstPhase,last.lastPhase+1);
 battle.course.phases=battle.course.phases.slice(first.firstPhase,last.lastPhase+1);
 battle.writingInterval={actionRange:{first:first.firstSequence,last:last.lastSequence},
  opening:structuredClone(evidence.process.phases[first.firstPhase].opening),
  closing:structuredClone(evidence.process.phases[last.lastPhase].closing)};
 // Earlier/later executed non-battle actions are written exactly once, at the
 // outer boundaries. The full immutable parent remains the audit authority.
 facts.events=facts.events.filter((_,index)=>index===eventIndex||index<eventIndex&&includesOpening||index>eventIndex&&includesEnding);
 if(!includesEnding){delete battle.aftermath;delete battle.settlement;facts.changes=[];}
 if(!includesOpening)delete battle.openingSettlement;
 // The final world can already be back at the entrance after a defeat. Select
 // profiles from actual battle/adjacent events, not everyone registered there.
 // Whole-battle combatants remain even if they exited before this section.
 const people=storyWritingPersonReferences(facts.events,facts.changes);
 if(source.origin.audience.kind==='private'&&source.origin.audience.personId)people.add(source.origin.audience.personId);
 // Failed/skipped event records do not expose all requested target IDs.
 // Keep their context rather than guess which profile they need.
 const unscopedRequest=facts.events.some(e=>e.status==='执行失败'||e.status==='未执行');
 if(!unscopedRequest)facts.participants=facts.participants.filter(person=>typeof person.id!=='string'||people.has(person.id));
 selectStoryPersonHistories(facts.continuity,new Set(facts.participants.map(person=>person.id)));
 event.facts.wholeBattleReference=storyBattleWritingReference(event.facts.wholeEventStatement,battle,facts.participants);
 if(!includesEnding)event.facts.wholeBattleReference.scope='本场原始开局参考；当前阶段读取writingInterval、account以及有时点的battleBackground';
 event.statement=[`本段为本场战斗第${first.firstSequence}至${last.lastSequence}项已结算行动的连续经过。`,
  storyBattleCheckpointSummary(battle.writingInterval.opening,'本段开始时'),
  storyBattleCheckpointSummary(battle.writingInterval.closing,'本段结束时'),
  ...(includesEnding?[storyBattleConclusion(battle)]:[]),
 ].join('\n');
 return deriveStoryWritingSection(source,facts,{sourcePackageId:source.id,sourceEventIndex:eventIndex,battleId:battle.id,
  firstPassage:first.firstPassage,lastPassage:last.lastPassage,firstPhase:first.firstPhase,lastPhase:last.lastPhase,
  firstSequence:first.firstSequence,lastSequence:last.lastSequence,includesOpening,includesEnding});
}

/** Prefer one complete battle when the entire author/review/repair cycle fits.
 * Event markers retain provenance without forcing separate model calls.
 * Capacity alone splits at existing checkpoints; preflight every part before paying. */
export function planStoryBattleWritingSections(source:StoryWritingPackage,fits:(p:StoryWritingPackage)=>boolean){
 if(fits(source))return [source];
 const reading=storyBattleWritingBoundaries(source);
 const ends=new Set(reading?storyBattleEventUnits(reading.battle.account.passages).map(unit=>reading.battle.account.passages[unit.last].sourceSequences.at(-1)):[]);
 if(!reading?.boundaries.length)throw Error('必要写作资料超限，且没有可独立保留的战斗阶段');
 if([...ends].some(end=>!reading.boundaries.some(boundary=>boundary.lastSequence===end)))throw Error('事件经过缺少自身的实际边界，尚未请求作者');
 const sections:StoryWritingPackage[]=[];
 for(let start=0;start<reading.boundaries.length;){
  let accepted:StoryWritingPackage|undefined,end=start;
  for(let candidate=start;candidate<reading.boundaries.length;candidate++){
   const section=selectStoryBattleWritingSection(source,start,candidate);
   if(!fits(section))break;
   accepted=section;end=candidate;
  }
  if(!accepted)throw Error(`战斗第${reading.boundaries[start].firstSequence}项起的必要阶段资料仍超限；已结算结果保留，尚未请求作者`);
  sections.push(accepted);start=end+1;
 }
 return sections;
}

export function storyWritingSectionCards(source:StoryWritingPackage,cards:StoryInlineCard[]){
 const section=source.origin.writingSection;
 if(!section)return cards;
 const steps=new Set(source.facts.events.map(e=>e.step));
 return cards.filter(card=>{
  if(card.kind==='person')return section.includesOpening;
  if(card.kind==='check')return steps.has(card.source.step!);
  if(card.source.battleId!==section.battleId)return false;
  const sequence=card.source.sequence!;
  if(card.kind==='battle-state')return sequence===0?section.includesOpening:section.includesEnding;
  return sequence>=section.firstSequence&&sequence<=section.lastSequence;
 });
}
