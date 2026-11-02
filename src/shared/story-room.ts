/** Match the unresolved room to the exact public story/expedition that entered it. */
export function pendingStoryRoom(state:any):boolean {
 const turn=state?.扩展?.story?.active,expedition=state?.远征?.当前,room=expedition?.currentRoom;
 return !!(turn?.status==='resolved'&&!turn.privatePersonId&&expedition?.phase==='awaiting-narrative'&&room?.narrativeRequest&&
  turn.after?.expedition?.id===expedition.id&&turn.results.some((r:any)=>r.status==='succeeded'&&r.action.kind==='enter-room'&&r.receipt?.type==='expedition-narrative-required'&&r.receipt.nodeId===room.nodeId));
}
