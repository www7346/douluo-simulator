import {jsonEqual} from '../shared/json-identity';
import {PARTY_PROPOSAL_ACTIONS} from '../shared/story-party-proposals';
import type {StoryPlan,StoryTurn} from './story-turns';

/** Shared by host preflight and execution; checks the plan without sending or settling anything. */
export function validateStoryPlanConversation(plan:StoryPlan,scope:Pick<StoryTurn,'partyChat'|'privatePersonId'|'battleId'>,completedPrefix=0):void{
 const groupActions=plan.segments.filter((s,i)=>s.action.kind!=='describe'&&!(i<completedPrefix&&s.action.kind==='clarify'));
 if(groupActions.some(s=>s.action.kind==='tell-party')&&(groupActions[0].action.kind!=='tell-party'||groupActions.filter(s=>s.action.kind==='tell-party').length!==1||scope.privatePersonId||scope.battleId))throw Error('队伍群消息须独立发送；先送达原话，再安排实际行动');
 if(scope.partyChat&&groupActions.length&&groupActions[0].action.kind!=='tell-party'&&groupActions.some(s=>s.action.kind!=='clarify'))throw Error('群内须先送达原话');
 if((scope.partyChat||groupActions[0]?.action.kind==='tell-party')&&plan.segments.some(s=>(PARTY_PROPOSAL_ACTIONS as readonly string[]).includes(s.action.kind))){
  const proposals=plan.segments.filter(s=>(PARTY_PROPOSAL_ACTIONS as readonly string[]).includes(s.action.kind)),first=proposals[0].action;
  const terms=(a:any)=>Object.fromEntries(Object.entries(a).filter(([k])=>k!=='characterId').map(([key,value])=>{
   // The action contract carries loot terms as JSON text, not spoken dialogue.
   if(key==='terms'&&typeof value==='string'){try{return [key,JSON.parse(value)];}catch{/* The normal action validator reports malformed terms. */}}
   return [key,value];
  }));
  if(groupActions.slice(1).some(s=>![...PARTY_PROPOSAL_ACTIONS,'clarify'].includes(s.action.kind))||groupActions[0].action.kind!=='tell-party'||new Set(proposals.map(s=>s.action.characterId)).size!==proposals.length||proposals.some(s=>!jsonEqual(terms(s.action),terms(first))||!String(groupActions[0].action.text).includes(s.source)))throw Error('群内须先送达原话，再对不同成员提出同一版条款；不能混入未说出口内容');
 }
}
