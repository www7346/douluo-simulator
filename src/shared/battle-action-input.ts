/** The public battle DTO is shared by buttons and the story adapter. */
export const BATTLE_ACTION_FIELDS=Object.freeze(['supportSelections','supportElements','residentId','method','deviceNodeId','lockId','knowledgeId','operation','carrierItemId','claim','decision','covert','offerId','targetId','itemId','type','actorId','skillId','targetIds','martialSoulId','castRank','modeId','maintenanceSourceId','statusId','movement','aimPoint','branchTargets','copySourceUnitId','summonSkillIds','summonSoulPower','controlTargetId','controlledIntent','mode','limits','relockAfterMinutes','force','permissionId','targetItemId','recipeId','blueprintId','materials','quantity']);
export const BATTLE_ACTION_TYPES=Object.freeze(['配置加持','召唤投影','技能','防御','放弃行动','逃跑','协助撤退','认输','克制','收回武魂','挣脱','停止维持','解除伪装','识破伪装','结束武魂真身','切换武魂','调节拘束','破坏封神台','控制命令','药剂施用']);
export function assertBattleActionInput(input:any):void{
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!(BATTLE_ACTION_FIELDS as readonly string[]).includes(k)))throw Error('战斗行动包含未开放的参数');
 if(typeof input.type!=='string'||!input.type.trim())throw Error('请选择具体战斗行动');
 if(input.supportSelections!==undefined&&(!Array.isArray(input.supportSelections)||input.supportSelections.length>40||input.supportSelections.some((row:any)=>!row||typeof row.skillId!=='string'||!Array.isArray(row.targetIds)||row.targetIds.some((id:any)=>typeof id!=='string')||Object.keys(row).some(k=>!['skillId','targetIds','elements'].includes(k)))))throw Error('请选择有效的加持层与同伴');
 if(input.summonSkillIds!==undefined&&(!Array.isArray(input.summonSkillIds)||input.summonSkillIds.length>18||input.summonSkillIds.some((id:any)=>typeof id!=='string'||!id||id.length>200)||new Set(input.summonSkillIds).size!==input.summonSkillIds.length))throw Error('请选择不重复的可继承魂技');
 if(input.summonSoulPower!==undefined&&(!Number.isSafeInteger(input.summonSoulPower)||input.summonSoulPower<0||input.summonSoulPower>9999))throw Error('分配魂力须为0至9999的整数');
}
export function assertBattleActionType(input:any):void{
 if(!BATTLE_ACTION_TYPES.includes(input?.type))throw Error('战斗行动type须使用正式行动类型；普通攻击和魂技均使用“技能”，并填写skillId');
}
