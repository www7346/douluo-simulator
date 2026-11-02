import {isHistoricalProjection,HISTORICAL_PROJECTION_MEANING} from '../shared/historical-projection';
const modes:Record<string,string>={spar:'切磋',endgame:'历史投影挑战','solo-competition':'单人比赛','slaughter-city':'杀戮场死斗'};
const settlements:Record<string,{mode:string;operation:string}>={
 'spar-resolved':{mode:'spar',operation:'恢复战前状态后结算切磋经验'},
 'endgame-challenge-resolved':{mode:'endgame',operation:'投影消散，回到进入前的现实状态，玩家保留挑战经历与战绩'},
 'solo-competition-match-resolved':{mode:'solo-competition',operation:'按比赛规则恢复参赛状态并推进淘汰表'},
 'slaughter-bout-resolved':{mode:'slaughter-city',operation:'按杀戮场规则结算本场、暂存奖励或败北损失'},
};

/** Derived chronology from the frozen arena receipt; no invented injury, rescue or revival cause. */
export function compileStoryBattleSettlement(report:any){
 const aftermath=report.aftermath,definition=settlements[aftermath?.type];
 const mode=report.context?.mode??definition?.mode;
 if(!mode&&!aftermath)return null;
 const kind=modes[mode]??mode??'未记录战斗类型';
 return {kind,context:structuredClone(report.context??null),...(isHistoricalProjection(report.context)?{meaning:HISTORICAL_PROJECTION_MEANING}:{}),
  stage:aftermath?'战斗结束且场外结算已完成':'仅记录战斗阶段，场外结算尚未记录',
  ...(aftermath?{sourceType:aftermath.type,operation:definition?.operation??null,summary:aftermath.summary??null,
   participants:(report.closing?.units??[]).map((unit:any)=>{
    const settled=aftermath.units?.find((entry:any)=>entry.id===unit.id);
    return {id:unit.id,name:unit.name,combatEnding:{life:unit.life,hp:unit.hp,sp:unit.sp},
     afterSettlement:settled?{life:settled.life??null,hp:settled.hp,sp:settled.sp}:null,
     statement:isHistoricalProjection(report.context)&&unit.id!==report.context.playerId
      ?`${unit.name}的历史投影已消散，现实人物没有参与此战，其状态未受影响。`:settled
      ?`${unit.name}在${kind}交锋结束时生命为${unit.hp}；${definition?.operation??'完成场外结算'}后，实际状态为${settled.life??'未记录'}，生命${settled.hp}、魂力${settled.sp}。`
      :`${unit.name}仅有战斗结束记录，场外结算未留存此单位的后续状态。`};
   })}:{}),
 };
}
