import {isSealedValue} from '../shared/frozen-snapshot';

// Only these commands can reuse a normalized world. All settlement and follow-up
// hooks still run first, including meetings, expirations and battle narration.
export function storyRecordCommand(type:string):boolean {
 return ['story.begin','story.finish','story.continue-locally','story.rewrite-prose','story.rewrite-archived-prose',
  'story.record-summary','story.record-stage-summary','story.answer','story.cancel-remaining'].includes(type);
}

function sameTree(a:any,b:any):boolean {
 if(Object.is(a,b))return true;
 if(!a||!b||typeof a!=='object'||typeof b!=='object'||Object.getPrototypeOf(a)!==Object.getPrototypeOf(b))return false;
 const proto=Object.getPrototypeOf(a);
 if(Array.isArray(a)?a.length!==b.length:proto!==Object.prototype&&proto!==null)return false;
 const keys=Object.keys(a),other=Object.keys(b);
 return keys.length===other.length&&keys.every((key,i)=>key===other[i]&&sameTree(a[key],b[key]));
}

export function reuseNormalizedStoryWorld(base:any,next:any) {
 if(!isSealedValue(base)||!Number.isSafeInteger(next.系统?.revision)||next.系统.revision!==base.系统.revision+1)return null;
 // Compare complete rule inputs, not ids, revision-only cache keys or short hashes.
 // Only the story ledger and runtime receipt list are opaque to world normalization.
 const {story:oldStory,webRuntime:oldJournal,...oldExtensions}=base.扩展;
 const {story:newStory,webRuntime:newJournal,...newExtensions}=next.扩展;
 const unchanged=sameTree({...base,扩展:oldExtensions,系统:{...base.系统,revision:next.系统.revision}},
  {...next,扩展:newExtensions});
 if(!unchanged)return null;
 return {...base,系统:next.系统,扩展:{...base.扩展,story:newStory,webRuntime:newJournal}};
}
