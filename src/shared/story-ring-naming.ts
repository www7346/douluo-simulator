/** Only preparations actually executed by this unfinished public turn trigger naming. */
export function pendingStoryRingNaming(state:any):{kind:'ring-item'|'ring-skills';input:{itemId?:string;pendingId?:string}}|null {
 const turn=state.扩展?.story?.active;if(turn?.status!=='resolved'||turn.privatePersonId)return null;
 for(const r of turn.results??[]){
  if(r.status!=='succeeded'||!['prepare-ring','prepare-ring-item'].includes(r.action.kind))continue;
  const pending=state.魂环?.待选择?.[r.receipt?.pendingId];if(pending?.status!=='pending'||pending.playerId!==state.角色?.主控单位ID)continue;
  if(r.action.kind==='prepare-ring-item'){
   const itemId=pending.sourceSettlement?.itemIds?.[0],item=state.物品?.实例?.[itemId];
   if(item?.payload?.ringPreparation?.pendingId===pending.id&&!item.payload.narrative)return {kind:'ring-item',input:{itemId}};
  }
  if(pending.naming?.source!=='llm-frozen-mechanics-narrative'||pending.naming?.pendingCandidateIds?.length)return {kind:'ring-skills',input:{pendingId:pending.id}};
 }
 return null;
}
