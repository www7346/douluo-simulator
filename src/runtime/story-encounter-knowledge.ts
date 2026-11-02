import type {StoryTurn} from './story-turns';
import {storyTurnPeople} from '../shared/story-event-context';

/** Positive contact counts from the frozen BEFORE state. No private contents or invented intimacy. */
export function storyInteractionContinuity(turn:StoryTurn){
 const ids=new Set<string>();
 for(const r of turn.results){if(r.status!=='succeeded')continue;const id=r.receipt?.statement?.listenerId??r.receipt?.address?.listenerId??r.receipt?.personId??r.receipt?.commitment?.personId;if(typeof id==='string'&&(!turn.privatePersonId||id===turn.privatePersonId))ids.add(id);}
 const people=[...(turn.before?.people??[]),...(turn.before?.knownPeople??[])];
 const participants=[...ids].flatMap(id=>{const person=people.find(p=>p.id===id),history=person?.history;if(!history)return [];
  const prior={statements:history.counts?.statements??0,addresses:history.addressCount??0,agreements:history.counts?.agreements??0,commitments:history.counts?.commitments??0,sharedEvents:history.counts?.['shared-events']??0};
  return Object.values(prior).some(n=>Number(n)>0)?[{personId:id,name:person.name,prior}]:[];
 });
 return participants.length?{playerId:turn.before?.player?.id,participants}:null;
}


/** Only newly created participants have a provable first recorded encounter in this turn. */
export function storyEncounterKnowledge(turn:StoryTurn){
 if(turn.privatePersonId||!turn.after?.player?.id)return null;
 const created=turn.results.filter(r=>r.status==='succeeded'&&r.action.kind==='introduce-person'&&r.receipt?.type==='story-person-created'&&!r.receipt.reused);
 const participants=created.flatMap(r=>{
  const id=r.receipt!.personId,person=storyTurnPeople(turn).find(o=>o.person.id===id)?.person;
  if(!person)return [];
  const statements=turn.results.filter(s=>s.status==='succeeded'&&s.receipt?.type==='person-heard-statement'&&s.receipt.statement?.listenerId===id&&s.receipt.statement?.speakerId===turn.after!.player.id).map(s=>({step:s.step,text:s.receipt!.statement.text,truth:s.receipt!.statement.truth}));
  return [{id,name:person.name,createdStep:r.step,statements,sharedEvents:structuredClone(person.recentSharedEvents??[])}];
 });
 if(!participants.length)return null;
 return {player:{id:turn.after.player.id,name:turn.after.player.name},participants};
}
