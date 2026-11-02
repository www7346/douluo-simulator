/** Temporary bodies keep the original person's visual and social identity. */
export function originalPersonId(state:any,id:string){const deploymentId=state?.战斗单位?.列表?.[id]?.扩展?.projection?.deploymentId;return state?.扩展?.combatDeployments?.records?.find((d:any)=>d.id===deploymentId)?.prototypeId??id;}
