import type {StoryTurn} from '../runtime/story-turns';
/** Step receipts are needed to continue; repeated before/after person dossiers are not. */
export function hostContinuationEvidence(turn:StoryTurn){
 return turn.results.map(r=>({step:r.step,source:r.source,action:r.action,status:r.status,...(r.receipt?{receipt:r.receipt}:{}),...(r.reason?{reason:r.reason}:{}),...(r.condition?{condition:r.condition}:{}),...(r.context?{occurrence:{before:{time:r.context.before.time,location:r.context.before.location},after:{time:r.context.after.time,location:r.context.after.location}}}:{})}));
}
