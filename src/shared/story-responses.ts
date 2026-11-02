/** Revision-bound presentation only; execution rechecks the original rules. */
export interface StoryResponses {
 revision:number;
 canRetryProse:boolean;
 pendingPersonWork?:boolean;
 commitments:any[];
 immediateGifts:any[];
 controlledGifts:any[];
 npcDecisions:any[];
 cooperation:any[];
 trades:any[];
 auctions:any[];
}
