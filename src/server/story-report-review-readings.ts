import {promptDataMessage} from '../runtime/model-prompt-templates';
import {compactStoryPacketReadings,expandStoryPacketReadings} from './story-host-record-columns';
import type {ChatMessage} from '../runtime/model-gateway';
import type {StoryKeyCheck} from './story-review-checks';

/** A complete novel remains visible in every reading. Character checks also
 * receive every performed-event statement, so a capability catalogue cannot
 * be mistaken for the explanation of an ordinary action already resolved by
 * the rules. Full action details and full background are retained across the
 * readings, without duplicating both large records in each request. */
export function storyReportReviewReadings(messages:ChatMessage[],checks:StoryKeyCheck[],paths:Map<string,string>){
 const packet=expandStoryPacketReadings(JSON.parse(messages[1].content));
 const character=(check:StoryKeyCheck)=>check.evidenceIds.every(id=>/^\/participants\/\d+$|^\/events\/\d+\/facts\/battleBackground\/participants\/\d+$/.test(paths.get(id)??''));
 const people=checks.filter(character),events=checks.filter(check=>!character(check));
 const groups=[people,events].filter(group=>group.length).flatMap(group=>{
  const readings:StoryKeyCheck[][]=[];for(let at=0;at<group.length;at+=4)readings.push(group.slice(at,at+4));return readings;
 });
 return groups.map(group=>{
  const selected=structuredClone(packet),identity=group.every(character);
  if(identity&&events.length){
   for(const unit of selected.writingUnits.units)if(unit.passages)unit.passages=unit.passages.map((passage:any)=>
    typeof passage.statement==='string'?{$evidence:passage.$evidence,kind:passage.kind,sourceSequences:passage.sourceSequences,actor:passage.actor,statement:passage.statement}:passage);
  }else if(!identity&&people.length){
   delete selected.writingFacts.continuity;
   for(const event of selected.writingFacts.events)delete event.facts.battleBackground;
  }
  selected.keyChecks=group;
  selected.reviewScope={checkIds:group.map(check=>check.id),purpose:'本次核对这些关键项，完整小说及本场资料共同提供先后关系。'};
  const evidenceIds=new Set<string>();
  const visit=(value:any)=>{if(!value||typeof value!=='object')return;if(typeof value.$evidence==='string')evidenceIds.add(value.$evidence);Object.values(value).forEach(visit);};
  visit(selected.writingFacts);visit(selected.writingUnits);
  if(group.some(check=>check.evidenceIds.some(id=>!evidenceIds.has(id))))throw Error('整篇审阅缺少当前核对项的事实来源');
  return {messages:[messages[0],promptDataMessage(compactStoryPacketReadings(selected),{...messages[1].promptTemplate?.fields,'reviewScope.purpose':'review-scope'})],checks:group,
   scope:{unitIds:selected.writingUnits.units.map((unit:any)=>unit.id) as string[],passageIds:new Set<string>(group.flatMap(check=>check.passageIds)),evidenceIds}};
 });
}
