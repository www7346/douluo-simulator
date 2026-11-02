/** A pending code-produced loss list, never a model-authored confirmation. */
export function pendingStoryExtraction(state:any){
 const active=state.扩展?.story?.active;
 if(active?.status!=='resolved'||active.privatePersonId)return null;
 const step=active.results?.find((r:any)=>r.action?.kind==='extract-expedition'&&r.receipt?.type==='story-extraction-confirmation'&&r.receipt.decision==='pending');
 return step?{step:step.step,...step.receipt}:null;
}
