import {pendingImmediateGifts} from './story-immediate-gifts';
import {pendingCooperationResponses} from './person-cooperation';
import {pendingStoryCustodyMarket} from './story-custody-market';
import {pendingStoryControlledGifts} from './story-controlled-gifts';
import {pendingNpcDecisions} from './npc-autonomy';
import {pendingStoryBeliefs} from './story-person-knowledge';
import {pendingStoryCommitments} from './story-commitments';
import {pendingStoryExtraction} from './story-extraction';
import {pendingStoryRoom} from './story-room';
import {pendingStoryResearch} from './story-research';
import {pendingStoryRingNaming} from './story-ring-naming';

/** Derived readiness only; retries cannot advance a rule or supply a missing NPC decision. */
export function canRetryStoryProse(state:any,marketPending=pendingStoryCustodyMarket(state),personPending=false):boolean{
 const turn=state.扩展?.story?.active;
 return turn?.status==='resolved'&&!(turn.hostProgress&&['waiting','ready'].includes(turn.hostProgress.status))&&!turn.continuation
  &&!personPending&&!pendingCooperationResponses(state,true).length&&!marketPending&&!pendingStoryControlledGifts(state).length&&!pendingNpcDecisions(state).length&&!pendingStoryBeliefs(state).length&&!pendingStoryCommitments(state).length&&!pendingImmediateGifts(state).length
  &&!pendingStoryExtraction(state)&&!pendingStoryRoom(state)&&!pendingStoryResearch(state)&&!pendingStoryRingNaming(state);
}

/** The nonce belongs to a user-triggered generation request, never to saved game state. */
export function validateStoryProseAttempt(state:any,kind:string,input:any,marketPending?:boolean,personPending=false):void{
 if(input?.proseAttemptId===undefined)return;
 if(!['story-writer','story-rewrite'].includes(kind)||typeof input.proseAttemptId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.proseAttemptId))throw Error('正文重试请求编号无效');
 const ledger=state.扩展?.story;
 const ready=kind==='story-writer'?canRetryStoryProse(state,marketPending,personPending):ledger?.active?.status==='complete'&&Boolean(ledger.active.prose)&&(input.original!==undefined||!ledger.active.partyChat);
 if(!ready||ledger.branchId!==input.branchId||ledger.active.number!==input.turn)throw Error('请先完成当前人物回应或行动，再重试正文');
}
