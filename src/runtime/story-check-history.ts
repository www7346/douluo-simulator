import {validateStoryCheckReceipt,validateStoryOpposedReceipt} from './story-checks';

export interface StoryCheckRecord {branchId:string;turn:number;step:number;receipt:Record<string,any>}
export function validateStoryCheckHistory(records:unknown,nextTurn:number){
 if(records===undefined)return;
 if(!Array.isArray(records))throw Error('检定历史格式无效');
 const ids=new Set<string>();let lastTurn=0,lastStep=-1;
 for(const entry of records){
  if(!entry||Object.keys(entry).some(k=>!['branchId','turn','step','receipt'].includes(k))||typeof entry.branchId!=='string'||!entry.branchId||!Number.isSafeInteger(entry.turn)||entry.turn<1||entry.turn>=nextTurn||!Number.isSafeInteger(entry.step)||entry.step<0||entry.step>11||entry.turn<lastTurn||entry.turn===lastTurn&&entry.step<=lastStep)throw Error('检定历史来源无效');
  const r=entry.receipt;
  if(!r||r.sourceId!==`story:${entry.branchId}:${entry.turn}:${entry.step}`||ids.has(r.sourceId))throw Error('检定历史来源重复或不一致');
  if(r.type==='story-attribute-check')validateStoryCheckReceipt(r);
  else if(r.type==='story-opposed-check')validateStoryOpposedReceipt(r);
  else throw Error('检定历史回执类型无效');
  ids.add(r.sourceId);lastTurn=entry.turn;lastStep=entry.step;
 }
}
/** Read a page from this snapshot's branch history without drawing any dice. */
export function storyCheckHistory(state:any,before=-1){
 const all:StoryCheckRecord[]=state.扩展?.story?.checks??[];
 const eligible=all.filter(r=>before===-1||r.turn<before);
 const records=eligible.slice(-8),firstTurn=records[0]?.turn;
 // Include a whole boundary turn so pagination never skips another check in that turn.
 const page=firstTurn===undefined?[]:eligible.filter(r=>r.turn>=firstTurn);
 return {type:'story-check-history',records:structuredClone(page),total:all.length,nextBefore:eligible.length>page.length?firstTurn:null,
  };
}
