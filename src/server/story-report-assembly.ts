import type {StoryWritingPackage} from './story-writing-package';
import {storyWritingUnits,readStoryWritingUnits,serializeStoryWritingUnits,type StoryUnitReading} from './story-writing-units';

/** Rebind section-local coordinates to the same source events in the complete
 * novel. A capacity split may divide one event into several adjacent pieces;
 * it cannot invent another event or omit/duplicate any source action. */
export function joinStoryReportReading(source:StoryWritingPackage,parts:{section:StoryWritingPackage;reading:StoryUnitReading}[]):StoryUnitReading{
 const units=storyWritingUnits(source),spans:StoryUnitReading['spans']=[],next=new Map(units.filter(u=>u.battleId).map(u=>[u.id,u.firstSequence!]));
 const steps=new Map(units.map(u=>[u.id,new Set<number>()]));let offset=0;
 for(const [partIndex,part] of parts.entries()){
  if(part.section.origin.writingSection?.sourcePackageId!==source.id)throw Error('战报阶段不属于当前完整来源');
  const local=storyWritingUnits(part.section);
  for(const [spanIndex,span] of part.reading.spans.entries()){
   const unit=local.find(u=>u.id===span.unitId);if(!unit)throw Error('战报阶段的原文来源不完整');
   const owner=units.find(u=>unit.battleId?u.battleId===unit.battleId&&u.step===unit.step&&unit.firstSequence!>=u.firstSequence!&&unit.lastSequence!<=u.lastSequence!
    :!u.battleId&&unit.steps.every(step=>u.steps.includes(step)));
   if(!owner)throw Error('战报阶段无法对应已有完整事件');
   if(unit.battleId){if(next.get(owner.id)!==unit.firstSequence)throw Error('整篇战报的实际行动存在缺口或重复');next.set(owner.id,unit.lastSequence!+1);}
   unit.steps.forEach(step=>steps.get(owner.id)!.add(step));
   const end=offset+span.end+(partIndex<parts.length-1&&spanIndex===part.reading.spans.length-1?2:0),previous=spans.at(-1);
   if(previous?.unitId===owner.id){if(previous.end!==offset+span.start)throw Error('同一事件的正文不连续');previous.end=end;}
   else spans.push({unitId:owner.id,start:offset+span.start,end});
  }
  offset+=part.reading.prose.length+2;
 }
 if(JSON.stringify(spans.map(s=>s.unitId))!==JSON.stringify(units.map(u=>u.id))
  ||units.some(u=>u.battleId&&next.get(u.id)!==u.lastSequence!+1||u.steps.some(step=>!steps.get(u.id)!.has(step))))throw Error('整篇战报尚未覆盖全部真实事件');
 const reading={prose:parts.map(part=>part.reading.prose).join('\n\n'),spans};
 if(readStoryWritingUnits(serializeStoryWritingUnits(reading),units).prose!==reading.prose)throw Error('整篇事件绑定改变了原文');
 return reading;
}
