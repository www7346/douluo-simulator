import type {ModelEvidence} from '../shared/model-evidence';

/** A readable preview of retained author output; it never completes a game turn. */
export function retainedStoryProse(evidence:ModelEvidence[],scope:{worldId:string;branchId:string;turn:number;revision:number}):string{
 const sources=evidence.filter(record=>record.worldId===scope.worldId&&record.branchId===scope.branchId&&record.turn===scope.turn&&record.snapshotRevision===scope.revision&&record.kind==='story-writer')
  .sort((a,b)=>b.startedAt.localeCompare(a.startedAt)||b.id.localeCompare(a.id));
 for(const record of sources){
  const parts=new Map<string,{prose:string;order:number}>();
  for(const draft of record.drafts){
   if(draft.phase!=='initial'||typeof draft.prose!=='string'||!draft.prose.trim())continue;
   const section=draft.section,range=section?.origin?.writingSection;
   const prose=draft.prose.replace(/\[\[\s*\/?\s*(?:unit|card|fact)\s*:[^\]\r\n]*(?:\]\]?|(?=\r?$))/gmu,'').trim();
   if(prose)parts.set(section?.id??'whole',{prose,order:Number.isSafeInteger(range?.firstSequence)?range.firstSequence:0});
  }
  if(parts.size)return [...parts.values()].sort((a,b)=>a.order-b.order).map(part=>part.prose).join('\n\n');
 }
 return '';
}
