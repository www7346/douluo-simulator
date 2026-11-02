/** Read-only narrative projection. Full receipts and audience proofs stay in the rule ledger. */
const copy=(v:any)=>structuredClone(v);
const progressRun=(value:any)=>({minutes:value.minutes,experienceGained:value.experienceGained,carryBefore:value.carryBefore,carryAfter:value.carryAfter,before:copy(value.before),after:copy(value.after)});
function mergeProgress(target:any,next:any){target.minutes+=next.minutes;target.experienceGained+=next.experienceGained;target.carryAfter=next.carryAfter;target.after=copy(next.after);}
export function narrativeAgreementEvents(events:any[]){
 const out:any[]=[];
 for(const event of events){if(!['proposed','accepted','rejected','cultivated','fulfilled','breached','ended'].includes(event.type)){out.push(copy(event));continue;}const row:any={id:event.id,type:event.type,at:event.at,order:event.order};for(const key of ['reason','actorId','deadline','terms','practiceStop'])if(event[key]!==undefined)row[key]=copy(event[key]);
  if(event.progress){Object.assign(row,{from:event.from,through:event.through,progress:progressRun(event.progress),sourceRange:{first:event.id,last:event.id,count:1}});const previous=out.at(-1);if(previous?.type==='cultivated'&&row.type==='cultivated'&&previous.through===row.from){previous.through=row.through;previous.at=row.at;previous.order=row.order;previous.sourceRange.last=row.id;previous.sourceRange.count++;mergeProgress(previous.progress,row.progress);continue;}}
  out.push(row);
 }return out;
}
export function narrativeExperiences(rows:any[]){
 const out:any[]=[];
 for(const original of rows){const row=copy(original),experience=row.experience,data=experience?.data,progress=data?.progress;
  if(experience?.type==='cultivated'&&progress){const from=experience.at-progress.minutes;data.progress=progressRun(progress);data.from=from;data.through=experience.at;data.sourceRange={first:experience.source.id,last:experience.source.id,count:1};const previous=out.at(-1),prior=previous?.experience;
   if(prior?.type==='cultivated'&&previous.subjectId===row.subjectId&&previous.channel===row.channel&&prior.actorId===experience.actorId&&prior.data.agreementId===data.agreementId&&prior.data.through===from){prior.data.through=data.through;prior.data.sourceRange.last=experience.source.id;prior.data.sourceRange.count++;mergeProgress(prior.data.progress,data.progress);previous.learnedThrough=row.learnedAt;previous.throughOrder=experience.order;continue;}
  }out.push(row);
 }return out;
}
export function narrativeCustodyFacts(facts:any){
 const social=facts.social;if(!social)return facts;
 const personal=(social.knowledge??[]).filter((k:any)=>k.fact.kind==='personal-experience');
 const experiences=narrativeExperiences(personal.map((k:any)=>({id:k.fact.id,at:k.fact.occurredAt,learnedAt:k.observation.learnedAt,channel:k.observation.channel,subjectId:k.fact.subject.personId,experience:copy(k.fact.subject.experience)})));
 return {...facts,social:{...social,knowledge:(social.knowledge??[]).filter((k:any)=>k.fact.kind!=='personal-experience'),experiences}};
}

/** Options retain every original fact ID for a later formal tell action. */
export function narrativeKnowledgeFact(fact:any){
 if(fact.kind!=='personal-experience')return copy(fact);
 const e=fact.subject.experience,p=e.data?.progress;
 return {id:fact.id,kind:fact.kind,occurredAt:fact.occurredAt,personId:fact.subject.personId,type:e.type,summary:e.summary,data:p?{agreementId:e.data.agreementId,minutes:p.minutes,experienceGained:p.experienceGained,before:p.before,after:p.after,carryBefore:p.carryBefore,carryAfter:p.carryAfter}:copy(e.data)};
}
