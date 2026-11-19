/** Read-only character perspective. Objective archives and relationships are unchanged. */
function activeCognition(state:any,personId:string){
 return Object.values(state.扩展?.cognitionChanges??{}).filter((c:any)=>c.targetId===personId&&(c.retention==='保留'||state.状态实例?.列表?.[c.sourceStatusId]?.状态==='生效')).map((c:any)=>({id:c.id,subjectId:c.subjectId,direction:c.direction,strength:c.strength,retention:c.retention,appliedAt:c.appliedAt,appliedOrder:c.appliedOrder,startedRevision:c.startedRevision,storyTurn:c.storyTurn,sourceStatusId:c.sourceStatusId}));
}
/** Mental mechanisms are rules data, not proof that their subject knows them. */
export function personCognition(state:any,personId:string,observerId=personId){
 return globalThis.SoulPersonChangeKnowledge?.safeCognition(state,personId,observerId)??[];
}
export function perceivedRelations(state:any,personId:string){
 return (globalThis.SoulPersonChangeKnowledge?.safeRelations(state,personId)??[]).map((relation:any)=>relationshipPresentation(relation,personId,relation.personId));
}
/** The stored roles belong to the original record's participant order. Narrative
 * readers receive only identities oriented to the explicitly named viewer. */
export function relationshipPresentation(relation:any,viewerId?:string,personId?:string){
 if(!relation)return relation;
 const result=structuredClone(relation);
 delete result.roles;
 const viewer=viewerId??result.viewerId,person=personId??result.personId;
 if(viewer&&person){
  Object.assign(result,{viewerId:viewer,personId:person,participants:[viewer,person]});
  const selfRole=result.selfRole??result.viewerRole,otherRole=result.otherRole??result.personRole;
  if(selfRole!==undefined)Object.assign(result,{selfRole,viewerRole:selfRole});
  if(otherRole!==undefined)Object.assign(result,{otherRole,personRole:otherRole});
 }
 if(result.cause==='ability-rewrite'||result.grantId||String(result.sourceId??'').startsWith('relation-rewrite:')){
  for(const key of ['cause','grantId','sourceId','source','reason','patchId','order','at','revision'])delete result[key];
 }
 if(result.cognitiveCustody)result.cognitiveCustody=relationshipPresentation(result.cognitiveCustody,viewer,person);
 return result;
}
export function remembersStoryTurn(state:any,personId:string,turn:number){
 return (globalThis.SoulPersonChangeKnowledge?.remembersTurn(state,personId,turn)??true)&&turn>Number(state.人物?.列表?.[personId]?.扩展?.cognitivePersona?.forgottenBeforeTurn??-1)&&!activeCognition(state,personId).some(c=>c.direction==='屏蔽既往经历'&&turn<=c.storyTurn);
}
export function remembersRecord(state:any,personId:string,record:any){
 if(globalThis.SoulPersonChangeKnowledge?.remembersRecord(state,personId,record)===false)return false;
 const turn=record?.source?.turn??record?.turn,preciseOrder=record?.learnedOrder??record?.order??record?.appliedOrder??record?.events?.at(-1)?.order;
 if(!Number.isSafeInteger(preciseOrder)&&Number.isSafeInteger(turn)&&!remembersStoryTurn(state,personId,turn))return false;
 const masks=activeCognition(state,personId).filter(c=>c.direction==='屏蔽既往经历');if(!masks.length)return true;
 const order=record?.order??record?.events?.at(-1)?.order;if(Number.isSafeInteger(order))return masks.every(c=>order>c.appliedOrder);
 if(Number.isSafeInteger(turn))return remembersStoryTurn(state,personId,turn);
 const time=record?.time??record?.at??record?.createdAt??record?.events?.[0]?.time;
 const at=Number.isSafeInteger(time)?time:time&&Number.isSafeInteger(time.day)?time.day*1440+time.hour*60+time.minute:null;
 if(at!==null)return masks.every(c=>at>c.appliedAt);
 const revision=record?.firstRevision??record?.source?.revision;return Number.isSafeInteger(revision)&&masks.every(c=>revision>c.startedRevision);
}
export function subjectivePerson(state:any,person:any){
 const cognition=personCognition(state,person.id),view=structuredClone(person);view.cognition=cognition;
 const settings=state.人物?.列表?.[person.id]?.扩展?.cognitivePersona;if(settings)view.personalSettings=structuredClone(settings);
 if(activeCognition(state,person.id).some(c=>c.direction==='屏蔽既往经历')||settings?.forgottenBeforeTurn!==undefined||(globalThis.SoulPersonChangeKnowledge?.memoryBoundary(state,person.id)?.order??0)>0){
  for(const key of ['encounter','lastEncounter'])if(view[key]&&!remembersRecord(state,person.id,view[key]))delete view[key];
  for(const key of ['recentSharedEvents','sharedBattleEncounters','recentCompanionAgreements','recentEndedCommitments','commitments'])if(Array.isArray(view[key]))view[key]=view[key].filter((r:any)=>remembersRecord(state,person.id,r)).map((r:any)=>Array.isArray(r.events)?{...r,events:r.events.filter((event:any)=>remembersRecord(state,person.id,event))}:r);
  // An aggregate has no per-event source: do not reintroduce pre-cutoff facts through its counts.
  delete view.history;
  if(view.backgroundContext){
   const background=view.backgroundContext,history=background.history??[];
   background.history=history.filter((record:any)=>remembersRecord(state,person.id,record));
   if(background.history.length!==history.length)delete background.situation;
   if(background.relationship?.sourceId){
    const source=history.find((record:any)=>record.sourceId===background.relationship.sourceId)
     ??Object.values(state.人物?.列表??{}).flatMap((p:any)=>p.扩展?.社交约定??[]).find((record:any)=>record.id===background.relationship.sourceId)
     ??state.世界?.custody?.events?.find((record:any)=>record.id===background.relationship.sourceId);
    // Identity remains an objective rule fact; it does not restore a forgotten
    // purchase or acquaintance to this character's personal memory.
    if(!source||!remembersRecord(state,person.id,source))background.relationship={...background.relationship,remembered:false,knowledge:'这是现有身份；本人不记得建立这段关系的既往经历。'};
   }
  }
  if(view.relationship?.sourceId){
   const relation=Object.values(state.人物?.列表??{}).flatMap((p:any)=>p.扩展?.社交约定??[]).find((r:any)=>r.id===view.relationship.sourceId);
   if(!relation||!remembersRecord(state,person.id,relation))view.relationship=null;
  }
 }
 if(view.relationship)view.relationship=relationshipPresentation(view.relationship);
 if(view.backgroundContext?.relationship)view.backgroundContext.relationship=relationshipPresentation(view.backgroundContext.relationship);
 return view;
}
