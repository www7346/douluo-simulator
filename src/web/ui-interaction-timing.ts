import type {GameDatabase} from '../runtime/storage';
export interface InteractionScope {worldId:string;sessionId:number;branchId?:string;turn?:number;revision:number;kind:'story'|'action';personId?:string}
type Outcome='complete'|'complete-unobserved'|'failed'|'cancelled'|'timeout'|'waiting-for-input'|'left';
interface Interaction {id:string;scope:InteractionScope;database:GameDatabase;started:number;settled?:number;published?:number;visible?:number;ready?:number;short?:boolean;unobservedRequested?:boolean;outcome?:Outcome}
export function interactionErrorOutcome(error:any):Outcome{if(error?.code==='cancelled'||error?.name==='TaskCancelledError'||error?.name==='AbortError')return 'cancelled';return /timeout|超时/i.test(String(error?.kind??error?.code??'')+' '+String(error?.message??''))?'timeout':'failed';}
const active=new Map<string,Interaction>(),now=()=>performance.now();
export function beginInteraction(scope:InteractionScope,database:GameDatabase):string{const id=crypto.randomUUID();active.set(id,{id,scope:{...scope},database,started:now()});return id;}
export function interactionScope(id:string){return active.get(id)?.scope;}
function finish(record:Interaction,outcome:Outcome){
 if(!active.delete(record.id))return;
 const ms=(value?:number)=>value===undefined?null:Math.max(0,Math.round(value-record.started));
 void record.database.recordDiagnostic(record.scope.worldId,{stage:record.scope.kind==='story'?'ui.story.interaction':'ui.action.interaction',status:['complete','complete-unobserved','waiting-for-input'].includes(outcome)?'complete':'failed',revision:record.scope.revision,operationId:record.id,details:{...record.scope,outcome,callReturnedMs:ms(record.settled),publishedMs:ms(record.published),finalProseVisibleMs:record.short||record.scope.kind==='action'?null:ms(record.visible),readyMs:ms(record.ready),elapsedMs:Math.round(now()-record.started),proseObservation:record.short||record.scope.kind==='action'?'not-applicable':record.visible===undefined?'not-observed':'observed'}}).catch(()=>{});
}
function complete(record:Interaction){if(record.settled===undefined||record.ready===undefined)return;if(record.scope.kind==='action'||record.short||record.published!==undefined&&record.visible!==undefined)finish(record,'complete');else if(record.published!==undefined&&record.unobservedRequested)finish(record,'complete-unobserved');}
export function settleInteraction(id:string,outcome:Outcome='complete'){const r=active.get(id);if(!r)return;r.settled??=now();if(outcome!=='complete')finish(r,outcome);else complete(r);}
export function readyInteraction(id:string){const r=active.get(id);if(r){r.ready??=now();complete(r);}}
export function visibleInteraction(id:string){const r=active.get(id);if(r){r.visible??=now();complete(r);}}
export function leaveInteraction(id:string){const r=active.get(id);if(r)finish(r,r.settled!==undefined&&r.ready!==undefined&&r.published!==undefined?'complete-unobserved':'left');}
export function routeInteraction(id:string,personId:string){const r=active.get(id);if(r)r.scope.personId=personId;}
export function unobservedInteraction(id:string){const r=active.get(id);if(r){r.unobservedRequested=true;complete(r);}}
export function publishInteraction(worldId:string,sessionId:number,branchId:string,turn:number,short=false,personId?:string){for(const r of active.values())if(r.scope.kind==='story'&&r.scope.worldId===worldId&&r.scope.sessionId===sessionId&&r.scope.branchId===branchId&&r.scope.turn===turn){if(personId)r.scope.personId=personId;r.published??=now();r.short=short;complete(r);}}
