/** Only research actually begun by this unfinished turn needs automatic naming. */
export function pendingStoryResearch(state:any):string|null {
 const turn=state.扩展?.story?.active;if(!turn||turn.status!=='resolved')return null;
 for(const r of turn.results??[]){const id=r.receipt?.pendingId,p=state.研发?.待处理?.[id];if(r.status==='succeeded'&&r.action.kind==='begin-research'&&p?.actorId===state.角色?.主控单位ID&&p?.status==='awaiting-llm')return id;}
 return null;
}
