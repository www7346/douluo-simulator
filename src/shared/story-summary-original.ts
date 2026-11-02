import {MAX_STORY_PROSE_LENGTH} from './story-prose';
import type {StoryTurn} from '../runtime/story-turns';
import {storySourceInput} from './story-source-input';
export const AUTOMATIC_BATTLE_REPORT_INPUT='根据已经结算的真实记录，写下这场战斗的经过。';
/** A local archive excerpt is narrative context, not proof of mechanical events. */
export interface StorySummaryOriginal {branchId:string;revision:number;turn:number;input:string;prose:string;privatePersonId?:string;automaticReportInput?:true}
export function makeStorySummaryOriginal(branchId:string,revision:number,turn:StoryTurn):StorySummaryOriginal{
 const result=turn.results[0],input=storySourceInput(turn);
 const automatic=!turn.privatePersonId&&!!turn.battleId&&input===AUTOMATIC_BATTLE_REPORT_INPUT&&turn.results.length===1
  &&result.source===input&&result.status==='succeeded'&&result.action.kind==='battle-report'
  &&result.action.battleId===turn.battleId&&result.receipt?.report?.id===turn.battleId;
 return {branchId,revision,turn:turn.number,input,prose:turn.prose!,...(turn.privatePersonId?{privatePersonId:turn.privatePersonId}:{}),...(automatic?{automaticReportInput:true}:{})};
}
export function checkStorySummaryOriginal(value:unknown,beforeTurn:number,revision:number):StorySummaryOriginal {
 const v=value as StorySummaryOriginal;
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!['branchId','revision','turn','input','prose','privatePersonId','automaticReportInput'].includes(k)))throw Error('旧段记忆来源无效');
 const text=(s:unknown,max:number)=>typeof s==='string'&&s.trim().length>0&&s.length<=max;
 if(v.automaticReportInput!==undefined&&(v.automaticReportInput!==true||v.input!==AUTOMATIC_BATTLE_REPORT_INPUT||v.privatePersonId!==undefined))throw Error('自动战报来源无效');
 if(!text(v.branchId,160)||!Number.isSafeInteger(v.revision)||v.revision<0||v.revision>=revision||!Number.isSafeInteger(v.turn)||v.turn<1||v.turn>=beforeTurn||!text(v.input,8000)||!text(v.prose,MAX_STORY_PROSE_LENGTH)||v.privatePersonId!==undefined&&!text(v.privatePersonId,160))throw Error('旧段记忆来源不是此前的完整交谈');
 return structuredClone(v);
}
export function summaryOriginalTurn(original:StorySummaryOriginal):StoryTurn {
 return {number:original.turn,input:original.input,prose:original.prose,status:'complete',results:[],...(original.privatePersonId?{privatePersonId:original.privatePersonId}:{})};
}
