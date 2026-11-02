import {isCurrentSnapshot} from '../shared/snapshot-version';
import {rules} from '../rules';
import type {BackupRecord,SaveSlotRecord} from './storage';
import {recoveryCandidates,rankRecoveryChoices} from '../shared/journey-recovery';
export type {JourneyRecoveryChoice} from '../shared/journey-recovery';
export {pendingBattleAftermath} from './journey-status';
export function inspectRecovery(current:any,snapshot:any):{pass:boolean;outsideActivity:boolean} {
  const playerId=current?.角色?.主控单位ID,state=snapshot?.state,unit=state?.战斗单位?.列表?.[playerId];
  if(!playerId||!isCurrentSnapshot(snapshot)||state?.角色?.主控单位ID!==playerId||state?.世界?.seed!==current?.世界?.seed||!unit||unit.存活状态==='死亡'||!(unit.资源?.生命?.当前>0))return {pass:false,outsideActivity:false};
  try{if(!rules.world.validateState(state).pass)return {pass:false,outsideActivity:false};}catch{return {pass:false,outsideActivity:false};}
  return {pass:true,outsideActivity:state.战斗?.状态!=='进行中'&&!state.远征?.当前&&!rules.world.worldActionBlockReason(state)};
}
/** Server and original-engine test entry; the browser consumes inspected results. */
export function journeyRecoveryChoices(current:any,profileId:string,backups:BackupRecord[],slots:SaveSlotRecord[]) {
  return rankRecoveryChoices(current,profileId,backups,slots,new Map(recoveryCandidates(profileId,backups,slots).map(({record})=>[record,inspectRecovery(current,record.snapshot)])));
}
