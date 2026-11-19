import {rules} from '../rules';
import {effectiveBattlePreferences} from '../shared/battle-preferences';
import {captureBattleView,type BattleTurnView} from './player-presentation';
import {receiptSummary} from './player-text';
import {battleAdjudication} from './battle-adjudication';
import {isHistoricalProjection,HISTORICAL_PROJECTION_MEANING} from '../shared/historical-projection';

/** Mechanical history, separate from rendered event retention and generated prose. */
export function retainBattleReport(before:any,after:any,frames:BattleTurnView[],commandId:string){
 const battle=after.战斗,battleId=battle?.id;
 const startedNow=before.战斗?.id!==battleId&&battle?.扩展?.开战结算单?.battleId===battleId;
 if(!battleId||(!frames.length&&battle.状态!=='进行中'&&!startedNow))return;
 after.扩展??={};after.扩展.battleReports??={};
 const reports=after.扩展.battleReports;
 let report=reports[battleId];
 if(!report){
  const started=before.战斗?.id!==battleId||before.战斗?.状态!=='进行中';
  const opening=frames[0]?.before??captureBattleView(after);
  report={id:battleId,startedAt:battle.扩展?.clock?.createdAt??null,startedRevision:before.系统.revision+1,completeFromStart:started,context:structuredClone(battle.扩展?.竞技??null),openingReceipt:structuredClone(battle.扩展?.开战结算单??null),opening:structuredClone(opening),closing:structuredClone(opening),actions:[],status:'进行中',outcome:null};
  const room=rules.expeditionContext.forBattle(after,battleId)?.currentRoom;
  report.boss=room?.type==='首领战斗'||battle.扩展?.竞技?.mode==='endgame';
  report.battlePreferences=effectiveBattlePreferences(after);
  reports[battleId]=report;
 }
 for(const [index,frame] of frames.entries()){
  if(frame.before.battleId!==battleId||frame.after.battleId!==battleId)throw Error('战斗记录与当前战场不一致');
  const id=`${commandId}:${index}`;
  if(report.actions.some((action:any)=>action.id===id))continue;
  const witnesses=rules.combatDeployments.witnesses(after,frame.receipt.id,frame.receipt);
  report.actions.push({id,sequence:report.actions.length+1,round:frame.before.round,receipt:structuredClone(frame.receipt),witnesses,
   summary:receiptSummary('battle.action',frame.receipt,after),judgments:battleAdjudication(frame.receipt,after)});
  report.closing=structuredClone(frame.after);
 }
 if(battle.状态==='进行中'&&report.battlePreferences)report.battlePreferences=effectiveBattlePreferences(after);
 report.status=battle.状态;
 report.outcome=structuredClone(battle.扩展?.结果??null);
}

export function readBattleReport(state:any,battleId:unknown){
 if(typeof battleId!=='string'||!battleId)throw Error('请选择要回顾的战斗');
 const report=state.扩展?.battleReports?.[battleId];
 if(!report)throw Error('没有找到这场战斗的真实记录');
 return structuredClone(report);
}

/** A frozen fragment for one story operation; report retention still happens once. */
export function battleActionReport(before:any,after:any,frames:BattleTurnView[],commandId:string,sequenceOffset:number){
 if(!frames.length)throw Error('战斗行动缺少实际行动帧');
 const projection={...after,扩展:{...after.扩展,battleReports:{}}};
 retainBattleReport(before,projection,frames,commandId);
 const report=projection.扩展.battleReports[after.战斗.id];
 report.completeFromStart=false;report.openingReceipt=null;
 for(const action of report.actions)action.sequence+=sequenceOffset;
 return structuredClone(report);
}

/** Freeze the arena settlement separately from the combat ending, including surviving residents. */
export function retainArenaAftermath(state:any,battleId:string,receipt:any){
 const report=state.扩展?.battleReports?.[battleId];
 if(!report||report.status!=='已结束'||!['spar-resolved','endgame-challenge-resolved','solo-competition-match-resolved','slaughter-bout-resolved'].includes(receipt?.type))return;
 report.aftermath={type:receipt.type,summary:receipt.summary,...(isHistoricalProjection(report.context)?{scope:'historical-projection',meaning:HISTORICAL_PROJECTION_MEANING,dissipatedUnitIds:report.closing.units.filter((u:any)=>u.id!==report.context.playerId).map((u:any)=>u.id)}:{}),
  units:report.closing.units.flatMap((past:any)=>{
   const unit=state.战斗单位?.列表?.[past.id];
   return unit?[{id:past.id,name:String(unit.名称??past.name),life:String(unit.存活状态??''),hp:Number(unit.资源?.生命?.当前??0),sp:Number(unit.资源?.魂力?.当前??0)}]:[];
  })};
}

export function recentBattleReports(state:any){
 return Object.values(state.扩展?.battleReports??{}).slice(-5).map((r:any)=>({id:r.id,status:r.status,outcome:r.outcome,context:structuredClone(r.context??null),...(isHistoricalProjection(r.context)?{meaning:HISTORICAL_PROJECTION_MEANING}:{}),completeFromStart:r.completeFromStart,actionCount:r.actions.length,
  participants:r.opening.units.map((u:any)=>({id:u.id,name:u.name,sideId:u.sideId}))}));
}

interface SharedBattleEncounter {
 battleId:string;time:number|null;participants:Array<{id:string;name:string;sideId:string}>;scope:string;
 learnedOrder?:number;observedActionCount?:number;ownActionCount?:number;actions?:any[];
 settledSpar?:{playerId:string;opponentId:string;winnerIds:string[];playerOutcome:'胜利'|'失败'|'平局';summary:string};
}
/** Opening witnesses retain opening knowledge; recovered sparring partners also know their settled result. */
export function sharedBattleEncounters(state:any,personId:string):SharedBattleEncounter[]{
 const playerId=state.角色?.主控单位ID,person=state.人物?.列表?.[personId];
 if(!playerId||!person||personId===playerId)return [];
 const unitId=person.combatantId||personId;
 return Object.values(state.扩展?.battleReports??{}).flatMap<SharedBattleEncounter>((report:any)=>{
  if(isHistoricalProjection(report.context)||!report.completeFromStart||report.status!=='已结束')return [];
  const present=(report.opening?.units??[]).filter((u:any)=>u.hp>0&&u.memberStatus==='active');
  const projected=(report.actions??[]).filter((a:any)=>a.receipt?.id&&rules.combatDeployments.witnesses(state,a.receipt.id,a.receipt).some((w:any)=>w.personId===personId&&rules.personChangeKnowledge.remembers(state,personId,{learnedOrder:w.order,at:w.at})));
  if(projected.length){const names=new Map((report.opening?.units??[]).map((u:any)=>[u.id,u.name])),ownCarriers=new Set(rules.combatDeployments.table(state).records.filter((r:any)=>r.prototypeId===personId&&r.mode==='projection').map((r:any)=>r.unitId));return [{battleId:report.id,time:report.startedAt??null,learnedOrder:Math.max(...projected.flatMap((a:any)=>rules.combatDeployments.witnesses(state,a.receipt.id,a.receipt).filter((w:any)=>w.personId===personId).map((w:any)=>w.order))),participants:present.map((u:any)=>({id:u.id,name:u.name,sideId:u.sideId})),scope:'本人意识通过投影实际在场时亲历的片段；仅包含当时实际感知，不预设投影后来是否消散。',observedActionCount:projected.length,ownActionCount:projected.filter((a:any)=>ownCarriers.has(a.receipt.actorId)).length,actions:projected.slice(-16).map((a:any)=>({sequence:a.sequence,round:a.round,actorId:a.receipt.actorId,actorName:names.get(a.receipt.actorId)??a.receipt.actorId,action:a.receipt.skill?.name??a.receipt.actionType,targets:(a.receipt.targets??[]).map((t:any)=>({id:t.targetId,name:names.get(t.targetId)??t.targetId}))}))}];}
  if(!present.some((u:any)=>u.id===playerId)||!present.some((u:any)=>u.id===unitId))return [];
  const player=present.find((u:any)=>u.id===playerId),opponent=present.find((u:any)=>u.id===unitId);
  const recovered=report.aftermath?.type==='spar-resolved'&&report.context?.mode==='spar'&&report.context.opponentId===unitId&&[playerId,unitId].every(id=>report.aftermath.units?.some((u:any)=>u.id===id&&u.life==='存活'));
  const winner=report.outcome?.winnerSideId;
  const playerOutcome:'胜利'|'失败'|'平局'=winner===player.sideId?'胜利':winner===opponent.sideId?'失败':'平局';
  const settledSpar=recovered?{playerId,opponentId:personId,winnerIds:present.filter((u:any)=>u.sideId===winner).map((u:any)=>u.id),playerOutcome,
   summary:`${player.name}与${opponent.name}的切磋已结算，${playerOutcome==='胜利'?player.name+'获胜':playerOutcome==='失败'?opponent.name+'获胜':'双方战平'}。双方已恢复战前的生命与魂力。`}:undefined;
  return [{battleId:report.id,time:report.startedAt??null,participants:present.map((u:any)=>({id:u.id,name:u.name,sideId:u.sideId})),
   scope:settledSpar?'双方亲历并已完成结算的切磋':'战斗开场的共同在场者',...(settledSpar?{settledSpar}:{})}];
 }).slice(-8);
}


/** Writer projection of frozen display facts; full receipts remain in the saved report. */
export function battleReportWritingFacts(report:any){
 const frame=(value:any)=>({...value,units:value.units.map(({portrait,distanceLabel,...unit}:any)=>({...unit,
  ...(distanceLabel===undefined?{}:{distanceFromPlayer:distanceLabel})}))});
 // A requested skill action can lose its turn before executeSkill; only receipt.skill proves a cast.
 const execution=(receipt:any)=>receipt.type==='combat-action'&&(Object.hasOwn(receipt,'skill')||receipt.creationSettlements?.length)?{
  requestedActionType:receipt.actionType,
  ...Object.fromEntries(['movement','statusEvents','escape','sourceItem','ingestion','restraint'].filter(key=>Object.hasOwn(receipt,key)).map(key=>[key,structuredClone(receipt[key])])),
  executedSkill:receipt.skill?{id:receipt.skill.id,name:receipt.skill.name,soulPowerCost:receipt.skill.soulPowerCost,
   castRank:receipt.skill.castRank,...Object.fromEntries(['sourceKind','sourceNativeOriginId','sourceMartialSoulId','sourceMartialSoulName','sourceRingId','sourceRingOrdinal','sourceRingYears','sourceRingColor','sourceRingTier','nativeCastRank'].filter(key=>Object.hasOwn(receipt.skill,key)).map(key=>[key,structuredClone(receipt.skill[key])])),branches:structuredClone(receipt.skill.branches??[])}:null,
  narrationFacts:structuredClone(receipt.narrationFacts??[]),
  targetResults:(receipt.targets??[]).map((target:any)=>({targetId:target.targetId,hit:typeof target.check?.hit==='boolean'?target.check.hit:null,affected:typeof target.affected==='boolean'?target.affected:null,defeated:typeof target.defeated==='boolean'?target.defeated:null,
   effects:(target.effects??[]).map((effect:any)=>({effectId:effect.effectId,...Object.fromEntries(['amount','hpDamage','remainingHp','statusId','remainingRounds','damageType','resistance','shieldUsed','absorbedAsShield','nonlethalPrevented','prevented','sources','removed','removedStatusIds','removedZoneIds','removedLayers','refreshed','layers','movedUnitId','from','to','nodeId','targetId','placement','maximumDistance','distance','reached','revived','lifeRestored','soulPowerRestored','remainingSoulPower','temporaryHp','temporaryHpBefore','offeredAmount','reflection','counteredSkillId','zoneId','domainId'].filter(key=>Object.hasOwn(effect,key)).map(key=>[key,structuredClone(effect[key])]))}))})),
  battleResult:receipt.battleResult?structuredClone(receipt.battleResult):null,
 }:null;
 const castCounts=new Map<string,number>(),actorCounts=new Map<string,number>();
 const names=new Map([...report.opening.units,...report.closing.units].map((u:any)=>[u.id,u.name]));
 const actions=report.actions.map((action:any)=>{
  const receipt=action.receipt,executed=execution(receipt);let observedCastIndex:number|null=null;
  if(executed?.executedSkill){const key=JSON.stringify([receipt.actorId,executed.executedSkill.id]);observedCastIndex=(castCounts.get(key)??0)+1;castCounts.set(key,observedCastIndex);}
  const observedActorActionIndex=typeof receipt.actorId==='string'?(actorCounts.get(receipt.actorId)??0)+1:null;
  if(observedActorActionIndex!==null)actorCounts.set(receipt.actorId,observedActorActionIndex);
  return {sequence:action.sequence,round:action.round,actorActionIndex:report.completeFromStart?observedActorActionIndex:null,observedActorActionIndex,actorId:receipt.actorId,actorName:names.get(receipt.actorId)??null,
   castIndex:report.completeFromStart?observedCastIndex:null,observedCastIndex,execution:executed,
   summary:action.summary??null,judgments:action.judgments??[],detailsAvailable:typeof action.summary==='string'&&Array.isArray(action.judgments)};
 });
 return {id:report.id,status:report.status,outcome:report.outcome,completeFromStart:report.completeFromStart,
  ...(report.context?{context:structuredClone(report.context)}:{}),
  ...(report.aftermath?{aftermath:structuredClone(report.aftermath)}:{}),
  endingActions:actions.filter((a:any)=>a.execution?.battleResult).map((a:any)=>({sequence:a.sequence,round:a.round,actorId:a.actorId,actorName:a.actorName,skillName:a.execution.executedSkill?.name??null,castIndex:a.castIndex,outcome:a.execution.battleResult.outcome})),
  opening:frame(report.opening),closing:frame(report.closing),
  actions};
}

