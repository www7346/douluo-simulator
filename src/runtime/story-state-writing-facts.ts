import {rules} from '../rules';
import type {UnitActionsReader} from './ability-presentation';
import {powerLimitReading} from './story-battle-action-reading';
const copy=<T>(v:T):T=>structuredClone(v);
const lightObservations=new WeakSet<object>();
export function withLightActionState<T>(state:object,read:()=>T):T{const had=lightObservations.has(state);lightObservations.add(state);try{return read();}finally{if(!had)lightObservations.delete(state);}}
export type StoryActionsReader=UnitActionsReader;
/** Each observation owns its characters' full skill catalogues. Light
 * observations still use the separate index for action conditions. */
export function withStoryActionsRead<T>(state:object,read:(actions:StoryActionsReader)=>T):T{
 return rules.combat.withAvailableActionsRead(state,read);
}
const pick=(v:any,keys:string[])=>Object.fromEntries(keys.filter(k=>v&&Object.hasOwn(v,k)).map(k=>[k,copy(v[k])]));
/** Apply the same knowledge boundary to current observations and stored dossiers. */
export function perceivedActionState(value:any,masked=false){
 if(!value)return value;
 const view=copy(value);
 if(view.influence)view.influence.cognition=[];
 if(view.constraints?.influence)view.constraints.influence.cognition=[];
 for(const influence of [view.influence,view.constraints?.influence])if(influence?.autonomy){delete influence.autonomy.sources;delete influence.autonomy.controlled;}
 view.statuses=(view.statuses??[]).filter((status:any)=>!['transform.sex','transform.disguise','status.cognition_shift'].includes(status.effectId));
 if(masked){view.abilityConditions=[];view.tacticalActions=null;if(view.constraints){view.constraints.activeMartialSoulId='';delete view.constraints.power;delete view.constraints.martialAvatarStatusId;}}
 return view;
}
/** Read-only projection of the checks used by the action menus and execution engine. */
export function storyActionState(state:any,actorId:string,perceived=false,readActions?:StoryActionsReader){
 const unit=state.战斗单位?.列表?.[actorId];if(!unit)return null;
 const battle=state.战斗,active=battle?.状态==='进行中',participant=active&&(battle.参与者ID列表??[]).includes(actorId);
 const contained=rules.sealing.active(state,actorId),containment=contained?{sealId:contained.id,itemId:contained.itemId,mode:contained.status==='confined'?'awake':'stasis',closed:true,personalTimePaused:contained.status==='sealed'}:null;
 const interior=rules.interiorSpaces.membership(state,actorId);
 const light=lightObservations.has(state),actions=light?rules.combat.listActionIndexPrepared(state,actorId):readActions?readActions(actorId):rules.combat.listAvailableActions(state,actorId);
 const influence=rules.influence.facts(state,actorId),statuses=rules.combat.listStatusViews(state,actorId);
 const result={observedAt:{revision:state.系统.revision,time:copy(state.世界?.时间??null)},lifeStatus:unit.存活状态,
  interiorSpace:interior?{spaceId:interior.space.id,name:interior.space.name,ownerId:interior.space.ownerId,regionId:interior.member.regionId,permissions:copy(interior.member.limits),environment:copy(interior.space.regions.find((r:any)=>r.id===interior.member.regionId).environment)}:null,influence,constraints:rules.combat.combatActionConstraints(state,actorId),statuses,
  battle:participant?{id:battle.id,round:battle.回合,activeParticipant:rules.combat.isActiveParticipant(state,actorId),currentActor:battle.当前行动单位ID===actorId}:null,
  abilityConditions:actions.map((a:any)=>pick(a,['id','name','actionType','sourceKind','sourceItemId','sourceMartialSoulId','sourceRingId','available','reason','soulPowerCost','activationLock','cooldownRemaining','perBattleUsed','perBattleRemaining','perBattleGroupUsed','perBattleGroupRemaining','dailyUsed','dailyRemaining'])),
  tacticalActions:participant&&battle.当前行动单位ID===actorId?(light?actions.filter((a:any)=>a.sourceKind==='tactic'):rules.combat.listTacticalActions(state,actorId)).map((a:any)=>pick(a,['id','name','actionType','residentId','available','reason'])):null,
  ...(actorId===state.角色?.主控单位ID?{worldActions:{personalBlockReason:rules.world.personalActionBlockReason(state),worldActivityBlockReason:rules.world.worldActionBlockReason(state),captivity:rules.world.activeCaptivity(state),containment}}:{})};
 // Feeling one's own current condition does not reveal a hidden cast or its operator.
 // Known changes and causes come from the existing personal experience records.
 const viewer=state.角色?.主控单位ID;
 const appearance=perceived&&actorId!==viewer?rules.disguise.presentation(state,actorId,viewer):null;
 return perceivedActionState(result,!!(appearance?.disguised||appearance?.identityHidden));
}
function known(v:any,fields:string[],label:string){const unknown=Object.keys(v).filter(k=>!fields.includes(k));if(unknown.length)throw Error(`状态可行性缺少字段编译：${label}/${unknown.join(',')}`);}
export function compileActionState(s:any){if(!s)return null;known(s,['interiorSpace','observedAt','lifeStatus','influence','constraints','statuses','battle','abilityConditions','tacticalActions','worldActions'],'当前资料');
 const c=s.constraints;known(c,['mainAction','voluntaryMovementReason','silence','cannotApproach','cannotAttack','canAttemptBreakFree','activeMartialSoulId','martialAvatarStatusId','restrictions','influence','power','desire','exchanges'],'动作限制');
 return {interiorSpace:copy(s.interiorSpace??null),observedAt:copy(s.observedAt),lifeStatus:s.lifeStatus,battle:copy(s.battle),
  mainActionImpairment:copy(c.mainAction),voluntaryBattleMovementBlockedBy:c.voluntaryMovementReason||null,
  silenceSources:copy(c.silence),restrictedApproachSources:copy(c.cannotApproach),restrictedAttackSources:copy(c.cannotAttack),canAttemptBattleBreakFree:c.canAttemptBreakFree,
  activeMartialSoulId:c.activeMartialSoulId,martialAvatarStatusId:c.martialAvatarStatusId,
  restrictions:copy(c.restrictions),influence:copy(s.influence),desire:copy(c.desire),exchanges:copy(c.exchanges),power:c.power?{...copy(c.power),statement:powerLimitReading(c.power)}:null,
  completedCognition:(s.influence.cognition??[]).map((change:any)=>({...copy(change),
   statement:`已完成的认知改变〔${change.direction}〕当前仍生效，强度${change.strength}，保留规则为${change.retention}${change.retention==='保留'?'；原施术来源结束后仍保留这份已完成的改变':''}。${change.direction==='屏蔽既往经历'?'这条改变只屏蔽既往经历，未登记忠诚或服从改变；精神或灵魂命令权须另按当前有效控制来源判断。':''}`})),
  activeStatuses:s.statuses.map((r:any)=>({instanceId:r.instanceId,effectId:r.effectId,name:r.name,source:{unitId:r.sourceUnitId,skillId:r.sourceSkillId,ringId:r.sourceRingId,martialSoulId:r.sourceMartialSoulId,receiptId:r.sourceReceiptId},duration:r.durationMode==='目标回合结束'?{mode:r.durationMode,remainingRounds:r.remainingRounds}:{mode:r.durationMode,appliedAt:r.appliedAt,expiresAt:r.expiresAt,remainingMinutes:r.remainingMinutes,sourcePolicy:r.sourcePolicy},params:copy(r.params),sealedMartialSoulId:r.sealedMartialSoulId,layers:r.layers,strength:r.strength,usesRemaining:r.usesRemaining})),
  abilityConditions:{scope:'已有行动的自身状态与代价条件；具体目标由行动预览再核验',actions:s.abilityConditions.map((a:any)=>{const {available,reason,...identity}=a;return {...copy(identity),selfConditionsMet:available,conditionReason:reason||null};})},
  currentTurnTactics:copy(s.tacticalActions),
  ...(s.worldActions?{worldActions:{personalBlockReason:s.worldActions.personalBlockReason||null,worldActivityBlockReason:s.worldActions.worldActivityBlockReason||null,captivity:s.worldActions.captivity?pick(s.worldActions.captivity,['id','actorId','captorId','custodianId','locationId','sourceId','since','text']):null,containment:s.worldActions.containment?copy(s.worldActions.containment):null}}:{})};
}
