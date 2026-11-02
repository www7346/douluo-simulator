import {compileContractObservation,contractPenaltyAccount} from './story-contract-writing-facts';
import {battleReportWritingFacts} from './battle-reports';
import {compileCommittedEffect} from './committed-effect-facts';
import {compileBattleLifecycle,compileBattleOpening,battleResourceOutcomeReading} from './battle-lifecycle-facts';
import {compileWorldEffectSettlements,worldEffectAccount} from './world-effect-writing';
import {isHistoricalProjection,HISTORICAL_PROJECTION_MEANING} from '../shared/historical-projection';

/** Same frozen report as the existing display compiler, with executed effects fully attributed.
 * Event-time restrictions and lifecycle data come from the original settlement, never current state.
 */
export function compileStoryBattleFacts(report:any){
 const {actions,aftermath,...facts}=battleReportWritingFacts(report);
 const outcome=aftermath?Object.fromEntries(Object.entries(aftermath).filter(([key])=>key!=='meaning')):undefined;
 const opening=report.openingReceipt,labels:Record<string,string>={encounter:'遭遇战',sparring:'切磋',competition:'普通比赛',lethal:'死斗'};
 const classification=isHistoricalProjection(report.context)?{kind:'historical-projection',name:'历史投影挑战',meaning:HISTORICAL_PROJECTION_MEANING,rules:structuredClone(opening?.battleRules??null)}:labels[opening?.battleKind]?{kind:opening.battleKind,name:labels[opening.battleKind],rules:structuredClone(opening.battleRules??null)}:null;
 return {...facts,...(classification?{classification}:{}),openingSettlement:compileBattleOpening(opening),...(outcome?{aftermath:outcome}:{}),actions:actions.map((action:any,index:number)=>{
  const {judgments:_arithmetic,summary:_summary,execution,...identity}=action;
  if(!execution)return {...identity,execution:null};
  const receipt=report.actions[index].receipt;
  const observation=compileContractObservation(receipt.personContracts),worldEffects=compileWorldEffectSettlements(receipt),names=new Map([...report.opening.units,...report.closing.units].map((u:any)=>[u.id,u.name]));
  return {...identity,source:{receiptId:receipt.id??null,actionId:receipt.actionId??null},execution:{...execution,...worldEffects,...(observation?{contractObservation:observation}:{}),narrationFacts:[...execution.narrationFacts,...(observation?.penalties??[]).map((p:any)=>contractPenaltyAccount(p,{person:(id:string)=>names.get(id)??'人物'} as any)),...worldEffectAccount(worldEffects,{person:(id:string)=>names.get(id)??'人物'} as any),...battleResourceOutcomeReading(receipt,id=>names.get(id)??'人物')],...compileBattleLifecycle(receipt),resources:structuredClone(receipt.resources??null),
   targetResults:execution.targetResults.map((target:any,targetIndex:number)=>{
    const {effects:_rawProjection,...result}=target;
    const raw=receipt.targets[targetIndex];
    const check=raw.check?Object.fromEntries(['type','mode','attribute','hit','saved','success','critical','successEffect','interference'].filter(key=>Object.hasOwn(raw.check,key)).map(key=>[key,structuredClone(raw.check[key])])):null;
    return {...result,check,...Object.fromEntries(['branchId','branchLabel','sourceUnitId','sourceSkillId','domainId','trigger'].filter(key=>Object.hasOwn(raw,key)).map(key=>[key,structuredClone(raw[key])])),effects:(raw.effects??[]).map((effect:any)=>compileCommittedEffect(effect,raw.sourceUnitId??receipt.actorId,target.targetId))};
   })}};
 })};
}
