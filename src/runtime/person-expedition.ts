import {rules} from '../rules';

function fields(input:any,allowed:string[],required=allowed){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!allowed.includes(k))||required.some(k=>typeof input[k]!=='string'||!input[k]))throw Error('人物远征回应须绑定原请求，不能指定另一位执行者');
}
/** Resolve the actor from the retained request, not a client-supplied identity. */
export function personRoomRequest(state:any,input:any){
 fields(input,['expeditionId','nodeId','mechanicsHash']);
 const a=rules.expeditionContext.byId(state,input.expeditionId),source=a?.currentRoom?.narrativeRequest;
 if(!a||a.leaderId===state.角色.主控单位ID||a.phase!=='awaiting-narrative'||!source||source.expeditionId!==a.id||source.nodeId!==input.nodeId||source.mechanicsHash!==input.mechanicsHash)throw Error('没有对应的NPC原房间命名请求');
 if(rules.expeditionContext.participantIds(a,{presentOnly:true}).includes(state.角色.主控单位ID))throw Error('主控正在参与本次远征，请从当前远征明确处理房间');
 rules.actions.resolve(state,{actorId:a.leaderId,battleId:null});
 return {actorId:a.leaderId,source};
}
export function resolvePersonRoom(state:any,input:any,sourceId:string){
 fields(input,['expeditionId','nodeId','mechanicsHash','narrative'],['expeditionId','nodeId','mechanicsHash']);
 const {narrative,...ref}=input,old=state.远征?.commandRequests?.[sourceId];
 const actorId=old?.request?.actorId??personRoomRequest(state,ref).actorId;
 if(actorId===state.角色.主控单位ID)throw Error('不能借人物回应操作主控远征');
 return rules.expedition.resolveRoomNarrative(state,narrative,sourceId,{...ref,actorId});
}
export function personRingRequest(state:any,input:any){
 fields(input,['pendingId','mechanicsHash']);
 const p=state.魂环?.待选择?.[input.pendingId];
 if(!p||p.status!=='pending'||p.playerId===state.角色.主控单位ID||p.mechanicsHash!==input.mechanicsHash)throw Error('没有对应的NPC本人魂技候选');
 rules.actions.resolve(state,{actorId:p.playerId,battleId:null,requirements:['soul-power']});
 if(p.origin?.expeditionId&&rules.expeditionContext.forActor(state,p.playerId)?.id!==p.origin.expeditionId)throw Error('人物已经离开原吸收现场');
 return p;
}
export function namePersonRing(state:any,input:any,sourceId:string){
 fields(input,['pendingId','mechanicsHash','candidates'],['pendingId','mechanicsHash']);
 const old=state.魂环?.operations?.[sourceId],actorId=old?.request?.actorId??personRingRequest(state,{pendingId:input.pendingId,mechanicsHash:input.mechanicsHash}).playerId;
 if(actorId===state.角色.主控单位ID)throw Error('不能借人物回应操作主控候选');
 return rules.cycle.nameRingSkillChoices(state,{actorId,...input},sourceId);
}
export function preferredPersonRingCandidate(state:any,pending:any){
 const soul=state.武魂.列表[pending.martialSoulId],ids=rules.canonicalGrowth.preferredIds(state,soul,pending.ringOrdinal);return pending.candidates.find((c:any)=>ids.includes(c.presetId));
}
export function choosePersonRing(state:any,input:any,sourceId:string){
 fields(input,['pendingId','mechanicsHash','decision'],['pendingId','mechanicsHash']);
 const old=state.魂环?.operations?.[sourceId],p=old?null:personRingRequest(state,{pendingId:input.pendingId,mechanicsHash:input.mechanicsHash}),d=input.decision;
 if(p&&(p.naming?.source!=='llm-frozen-mechanics-narrative'||p.naming?.pendingCandidateIds?.length))throw Error('须先完成原候选的命名');
 if(!d||typeof d!=='object'||Array.isArray(d)||Object.keys(d).some(k=>!['candidateId','reason'].includes(k))||typeof d.candidateId!=='string'||p&&!p.candidates.some((c:any)=>c.id===d.candidateId)||typeof d.reason!=='string'||!d.reason.trim()||d.reason.length>600)throw Error('人物须从本人冻结候选中选择并说明理由');
 const actorId=old?.request?.actorId??p.playerId;if(actorId===state.角色.主控单位ID)throw Error('不能借人物回应操作主控候选');
 return rules.cycle.confirmRingSkillChoice(state,{actorId,pendingId:input.pendingId,mechanicsHash:input.mechanicsHash,candidateId:d.candidateId,decisionReason:d.reason.trim()},sourceId);
}
