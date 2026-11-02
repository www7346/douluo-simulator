export interface BattlePlanContext {
  sessionId:number;
  battleId:string;
  revision:number;
  actorId:string|undefined;
  isPlayerTurn:boolean;
}

export function currentBattlePlan<T extends {context:BattlePlanContext}>(draft:T|null,context:BattlePlanContext):T|null {
  if(!draft || !context.isPlayerTurn || !context.actorId)return null;
  const source=draft.context;
  return source.sessionId===context.sessionId && source.battleId===context.battleId && source.revision===context.revision && source.actorId===context.actorId ? draft : null;
}

/** Open the server-quoted use, preserving target choices when switching mode. */
export function defaultBattleBranches(action:any,branchIds:string[]|undefined=action.defaultBranchIds,previous:Record<string,any>={}){
  const branches=action.effectBranches??[];
  return Object.fromEntries(branches.filter((branch:any)=>branch.optional).map((branch:any)=>[branch.id,{
    ...previous[branch.id],enabled:branchIds?branchIds.includes(branch.id):!branches.some((item:any)=>!item.optional)&&branch.id===branches[0]?.id
  }]));
}
