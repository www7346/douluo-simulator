/** Read the source frozen on an executed skill, not its owner's current catalogue. */
export function battleSkillSourceReading(skill:any){
 const parts:string[]=[];
 if(skill.sourceKind==='native-origin')parts.push('本源能力');
 if(skill.sourceMartialSoulId)parts.push(`武魂【${skill.sourceMartialSoulName||skill.sourceMartialSoulId}】`);
 if(skill.sourceRingId){
  const details=[Number.isFinite(skill.sourceRingYears)?`${skill.sourceRingYears}年`:'',skill.sourceRingColor?`${skill.sourceRingColor}色`:''].filter(Boolean);
  parts.push(`${Number.isInteger(skill.sourceRingOrdinal)&&skill.sourceRingOrdinal>0?`第${skill.sourceRingOrdinal}魂环`:'魂环'}${details.length?`（${details.join('，')}）`:''}`);
 }
 return parts.length?`本次施展来源：${parts.join('，')}`:'';
}
