/** Preserve authored prose at the data boundary, even when the model rewrites it. */
export function preserveRingDesignText(value:any,previous:any,preserve=true){
 if(!preserve||!Array.isArray(value?.proposals)||!Array.isArray(previous))return value;
 const originals=previous.map(row=>row.proposal??row).filter(row=>Array.isArray(row?.skills));
 if(!originals.length)return value;
 const result=structuredClone(value);
 result.proposals=result.proposals.map((proposal:any,index:number)=>{
  const original=originals.find(row=>row.name===proposal.name)??originals[index]??(originals.length===1?originals[0]:undefined);
  if(!original||!Array.isArray(proposal.skills))return proposal;
  const used=new Set<number>();
  return {...proposal,name:original.name,description:original.description,skills:proposal.skills.map((skill:any,i:number)=>{
   let at=original.skills.findIndex((row:any,j:number)=>!used.has(j)&&row.name===skill.name);
   if(at<0&&proposal.skills.length===original.skills.length&&!used.has(i))at=i;
   if(at<0)return skill;used.add(at);const old=original.skills[at];
   return {...skill,name:old.name,...(old.description!==undefined?{description:old.description}:{})};
  })};
 });
 return result;
}

/** Editing uses the same branch shape as the workshop, without client-side rules. */
export function editableRingProposal(catalogue:any,proposal?:any){
 const design=catalogue?.currentDesign;
 const value=structuredClone(proposal??{name:'自创魂技',description:'按所选效果施展魂技。',...(design?.source?{source:design.source}:{}),...(design?.acquisition?{acquisition:design.acquisition}:{}),...(design?.sourceProofVersion?{sourceProofVersion:design.sourceProofVersion}:{}),...(design?.sourceLocked?{sourceLocked:true}:{}),skills:design?.requestedSkills??[{name:'自创魂技',description:'按所选效果施展魂技。',requestedEffects:[]}]});
 value.skills=(value.skills??[]).map((skill:any,index:number)=>{
  const {requestedEffects,requestedEffectIds,requestedBranches,...rest}=skill;
  return {...rest,requestedBranches:requestedBranches??[{id:'skill-'+index,label:skill.name||'主要效果',activation:'active',optional:false,requestedEffects:requestedEffects??(requestedEffectIds??[]).map((id:string)=>[id,{}])}]};
 });
 return value;
}
