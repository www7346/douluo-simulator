/** Reading boundaries over performed events, never new combat/world state. */
export function storyBattleCourseEnds(row:any):boolean{
 return Boolean(row?.results?.some((r:any)=>r.defeated===true)||row?.stateChanges?.some((c:any)=>
  ['存活状态','参战状态','持有技能','实际行动限制'].includes(c.field)&&JSON.stringify(c.before)!==JSON.stringify(c.after))
  ||row?.martialSoulSwitch||row?.battleResult||row?.escape||row?.surrender);
}

/** Ordinary exchanges stay together. A new recorded consequence starts the
 * next course; a decisive change ends it. The compiler and writer share this
 * one partition so each generated section has an actual boundary checkpoint. */
export function storyBattleEventUnits(passages:any[]):{first:number;last:number}[]{
 const ranges:{first:number;last:number}[]=[];let first=0;
 const append=(last:number)=>{ranges.push({first,last});first=last+1;};
 for(const [index,passage] of passages.entries()){
  if(passage.beginsRecordedChange&&index>first&&passages.slice(first,index).some((p:any)=>p.kind==='交锋概括'))append(index-1);
  if(storyBattleCourseEnds(passage.event)||index===passages.length-1)append(index);
 }
 return ranges;
}
