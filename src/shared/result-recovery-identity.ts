/** HTTP attempts and presentation text are not the identity of the pending work. */
export function resultRecoveryIdentity(view:{profileId:string;sessionId:number;resultRecovery?:any;pendingGeneration?:any;pendingSoulAdvice?:{id:string}|null;pendingCreationAdvice?:{id:string}|null}){
 const r=view.resultRecovery,p=view.pendingGeneration;
 if(!r&&!p)return '';
 const id=view.pendingSoulAdvice?.id??view.pendingCreationAdvice?.id??p?.id??r?.jobId??`${r?.kind??'operation'}:${r?.revision??''}`;
 return `${view.profileId}:${id}`;
}
