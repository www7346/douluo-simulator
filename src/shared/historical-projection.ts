/** Authoritative encounter scope, retained on reports after the live instance ends. */
export function isHistoricalProjection(context:any):boolean {
 return context?.scope==='historical-projection';
}

export function activeHistoricalProjection(state:any):boolean {
 return isHistoricalProjection(state?.终局挑战?.当前?.projection);
}

/** Only a rewrite produced inside this encounter can edit its copied people. */
export function projectionRewriteGrant(state:any,grantId:unknown):boolean {
 const duel=state?.终局挑战?.当前,grant=state?.扩展?.personaRewrites?.grants?.[String(grantId)];
 const ids=[state?.角色?.主控单位ID,duel?.opponentId];
 return activeHistoricalProjection(state)&&!!grant&&!duel.projection.reality.扩展?.personaRewrites?.grants?.[String(grantId)]&&ids.includes(grant.actorId)&&ids.includes(grant.targetId);
}

export const HISTORICAL_PROJECTION_MEANING='历史投影试炼：对手只是登记时代的战斗映像，现实人物没有到场、受伤、死亡或获得这段共同记忆。场内变化不带回现实；玩家保留挑战经历与战绩，可以日后主动讲述。';
