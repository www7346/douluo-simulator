import {playerText} from './player-text';

/** A view of settled receipts; this never creates rewards or advances a bout. */
export function slaughterView(state:any) {
  const run=state?.杀戮场?.当前;
  if(!run)return null;
  const completed=run.status==='completed',failed=run.status==='failed';
  const loot=(entries:any[]=[])=>entries.map((item,index)=>({key:`${item.templateId??'loot'}-${index}`,name:playerText(item.name,state,'收获'),quantity:item.quantity??1}));
  return {
    active:!completed&&!failed,completed,failed,
    label:completed?'五场全胜':failed?`止步第 ${run.failedBout} 场`:run.match?`第 ${run.match.bout} 场 · 战斗中`:`第 ${run.nextBout} 场 · 等待入场`,
    stages:Array.from({length:run.totalBouts??5},(_,i)=>{
      const bout=i+1,record=run.boutHistory?.find((entry:any)=>entry.bout===bout);
      const status=record?.won?'complete':failed&&run.failedBout===bout?'failed':!completed&&!failed&&bout===(run.match?.bout??run.nextBout)?'current':'waiting';
      return {bout,status,label:status==='complete'?'已胜出':status==='failed'?'已败北':status==='current'?(run.match?'战斗中':'待入场'):'未开始'};
    }),
    earningsLabel:completed?'已结算收获':failed?'未能带出的收获':'累计待带出',
    experience:completed?run.reward?.experience??0:failed?run.lostExperience??0:run.tempExperience??0,
    loot:loot(completed?run.reward?.loot:failed?run.lostLoot:run.tempLoot),
    bones:(completed?run.reward?.deathDropSoulBoneItemIds:failed?[]:run.tempSoulBoneItemIds)??[],
    history:(run.boutHistory??[]).map((record:any)=>({bout:record.bout,won:record.won,experience:record.experience??0,loot:loot(record.loot),survivors:(record.survivors??[]).map((p:any)=>playerText(p.name,state,'魂师')).join('、')})),
    levelResult:completed?run.reward?.levelResult:null,
  };
}
