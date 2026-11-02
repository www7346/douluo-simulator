/** Missing player explanations do not require inventing a motive. NPC decisions keep their own reasons. */
export const PLAYER_REASON_ACTIONS=['bid-asset-auction','register-auction-proxy','respond-person-cooperation','end-person-cooperation','close-cooperation-preparation'] as const;
const missing=(value:unknown)=>value===undefined||typeof value==='string'&&!value.trim();
export function playerIntentDefaults(state:any,input:Record<string,any>):Record<string,any>{
 const player=state.角色?.主控单位ID;if(!player||(input.actorId??player)!==player)return input;
 if((PLAYER_REASON_ACTIONS as readonly string[]).includes(input.type)&&missing(input.reason)){
  const reason=input.type==='bid-asset-auction'?'按这个价格竞买。':input.type==='register-auction-proxy'?'按这个上限委托竞买。':input.type==='respond-person-cooperation'?(input.accept?'同意这次合作。':'拒绝这次合作。'):input.type==='end-person-cooperation'?'结束这次合作。':'结束这次收束安排。';
  return {...input,reason};
 }
 if(input.type==='assess-person-speech'&&input.decision&&typeof input.decision==='object'&&!Array.isArray(input.decision)&&missing(input.decision.reason))return {...input,decision:{...input.decision,reason:'按自己的判断看待这句话。'}};
 return input;
}
export function playerCommandDefaults(state:any,type:string,input:Record<string,any>):Record<string,any>{
 if(type==='world.intent')return playerIntentDefaults(state,input);
 if(type==='character.assess-speech')return {...input,decision:playerIntentDefaults(state,{type:'assess-person-speech',decision:input.decision}).decision};
 if(type==='expedition.respond-loot'&&input.decision&&typeof input.decision==='object'&&!Array.isArray(input.decision)&&missing(input.decision.reason))return {...input,decision:{...input.decision,reason:input.decision.accept?'同意这次分配。':'拒绝这次分配。'}};
 return input;
}
