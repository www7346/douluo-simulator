import type {GameSnapshot} from './contracts';
import type {StoryResponses} from '../shared/story-responses';
import {pendingStoryCommitments} from '../shared/story-commitments';
import {pendingImmediateGifts} from '../shared/story-immediate-gifts';
import {pendingStoryControlledGifts} from '../shared/story-controlled-gifts';
import {pendingNpcDecisions} from '../shared/npc-autonomy';
import {pendingCooperationResponses} from '../shared/person-cooperation';
import {canRetryStoryProse} from '../shared/story-prose-attempt';
import {pendingStoryCustodyTrades,pendingStoryCustodyAuctions} from './story-custody-market';
import {pendingStoryPersonWorldWork} from './person-world-work';

/** Keep rule-dependent response eligibility on the calculation service. */
export function storyResponses(snapshot:GameSnapshot):StoryResponses {
 const state=snapshot.state;
 const trades=pendingStoryCustodyTrades(state).map(r=>({offerId:r.id,buyerId:r.buyerId})),auctions=pendingStoryCustodyAuctions(state);
 const pendingPersonWork=pendingStoryPersonWorldWork(state).length>0;
 return {revision:snapshot.revision,pendingPersonWork,
  canRetryProse:canRetryStoryProse(state,Boolean(trades.length||auctions.length),pendingPersonWork),
  commitments:pendingStoryCommitments(state),immediateGifts:pendingImmediateGifts(state),controlledGifts:pendingStoryControlledGifts(state),
  npcDecisions:pendingNpcDecisions(state),cooperation:pendingCooperationResponses(state,true),trades,auctions};
}
