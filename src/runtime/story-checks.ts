import {rules} from '../rules';

export const STORY_CHECK_ATTRIBUTES=['力量','身法','体魄','悟性','感知','意志'];
export const STORY_CHECK_DIFFICULTIES=[5,10,15,20,25,30];
function checkSummary(r:any){return `${r.attribute}检定：d20(${r.die}) ${r.modifier<0?'-':'+'} ${Math.abs(r.modifier)} = ${r.total}，难度${r.difficulty}，${r.passed?'通过':'未通过'}。`;}
export function validateStoryCheck(input:Record<string,any>){
 if(!STORY_CHECK_ATTRIBUTES.includes(input.attribute)||!STORY_CHECK_DIFFICULTIES.includes(input.difficulty)||typeof input.reason!=='string'||!input.reason.trim()||input.reason.length>1000)throw Error('检定须明确六项属性之一、难度档和行动目的');
}
/** An operation-bound draw: retrying the same frozen story step never rerolls it. */
export function resolveStoryCheck(state:any,input:Record<string,any>,sourceId:string,context?:{actorId:string;allowExpedition:boolean;allowCaptivity?:boolean}){
 validateStoryCheck(input);
 const {actorId,unit}=checkActor(state,context);
 const modifier=rules.combat.attributeModifier(state,unit,input.attribute);
 const rng=rules.combat.makeRng(`${state.世界.seed}:story-check:${sourceId}`),die=rules.combat.rollDice(rng,1,20,'自由行动检定').total;
 const bonus=rules.exchange.activeCheckPenalty(state,actorId,input.attribute),total=die+modifier+bonus,passed=total>=input.difficulty;
 return {state,receipt:{type:'story-attribute-check',sourceId,actorId,attribute:input.attribute,difficulty:input.difficulty,reason:input.reason,die,modifier,bonus,total,passed,
  summary:checkSummary({...input,die,modifier,total,passed})}};
}
function checkActor(state:any,context?:{actorId:string;allowExpedition:boolean;allowCaptivity?:boolean}){
 const block=rules.world.worldActionBlockReason(state,{...(context?.allowExpedition?{allowActivities:['expedition']}:{}),allowCaptivity:context?.allowCaptivity===true});if(block)throw Error(block);
 if(!context?.allowExpedition&&state.远征?.当前&&!['completed','failed','extracted'].includes(state.远征.当前.status))throw Error('副本中的行动请使用现有房间与战斗规则');
 const actorId=context?.actorId??state.角色?.主控单位ID,unit=state.战斗单位?.列表?.[actorId];
 if(!unit||unit.存活状态!=='存活'||unit.资源.生命.当前<=0)throw Error('当前角色无法进行检定');
 return {actorId,unit};
}
export function validateStoryCheckReceipt(receipt:any){
 validateStoryCheck(receipt);
 if(!Number.isSafeInteger(receipt.total)||receipt.summary!==checkSummary(receipt))throw Error('检定回执与显示结果不一致');
 if(typeof receipt.sourceId!=='string'||!receipt.sourceId||typeof receipt.actorId!=='string'||!receipt.actorId||!Number.isInteger(receipt.die)||receipt.die<1||receipt.die>20||!Number.isSafeInteger(receipt.modifier)||(!Number.isInteger(receipt.bonus)||receipt.bonus>0||receipt.bonus< -4)||receipt.total!==receipt.die+receipt.modifier+receipt.bonus||receipt.passed!==(receipt.total>=receipt.difficulty))throw Error('检定回执与骰点或结果不一致');
}

export function validateStoryOpposedCheck(input:Record<string,any>){
 validateStoryCheck({...input,difficulty:5});
 if(!STORY_CHECK_ATTRIBUTES.includes(input.defenderAttribute)||typeof input.characterId!=='string'||!input.characterId)throw Error('对抗检定须指定在场人物与对方属性');
}
function opposedSummary(r:any){return `${r.attribute}对抗${r.defender.attribute}：d20(${r.die}) ${r.modifier<0?'-':'+'} ${Math.abs(r.modifier)} = ${r.total}；对方 d20(${r.defender.die}) ${r.defender.modifier<0?'-':'+'} ${Math.abs(r.defender.modifier)} = ${r.defender.total}，${r.passed?'通过':'未通过'}（平局防守方胜）。`;}
export function resolveStoryOpposedCheck(state:any,input:Record<string,any>,sourceId:string){
 validateStoryOpposedCheck(input);const {actorId,unit}=checkActor(state);
 const defenderId=rules.arena.CHARACTER_CATALOG[input.characterId]?rules.arena.persistentCharacterId(input.characterId):input.characterId;
 const person=state.人物?.列表?.[defenderId],defenderUnit=state.战斗单位?.列表?.[defenderId];
 if(defenderId===actorId)throw Error('不能与自己进行对抗检定');
 if(!person||!defenderUnit)throw Error('请先接触并登记这位人物，再进行对抗检定');
 if(!rules.actions.colocated(state,actorId,defenderId))throw Error('这位人物不在当前地点');
 if(person.status==='dead'||defenderUnit.存活状态!=='存活'||defenderUnit.资源.生命.当前<=0)throw Error('这位人物目前无法参与对抗');
 const rng=rules.combat.makeRng(`${state.世界.seed}:story-opposed-check:${sourceId}`);
 const draw=(u:any,attribute:string)=>{const die=rules.combat.rollDice(rng,1,20,'对抗检定').total,modifier=rules.combat.attributeModifier(state,u,attribute),bonus=rules.exchange.activeCheckPenalty(state,u.id,attribute);return {attribute,die,modifier,bonus,total:die+modifier+bonus};};
 const actor=draw(unit,input.attribute),defender={actorId:defenderId,...draw(defenderUnit,input.defenderAttribute)};
 const receipt={type:'story-opposed-check',sourceId,actorId,characterId:input.characterId,reason:input.reason,...actor,defender,passed:actor.total>defender.total,summary:''};
 receipt.summary=opposedSummary(receipt);return {state,receipt};
}
export function validateStoryOpposedReceipt(r:any){
 if(!r.defender||typeof r.defender.actorId!=='string'||!r.defender.actorId||r.defender.actorId===r.actorId)throw Error('对抗检定回执缺少有效对手');
 validateStoryOpposedCheck({...r,defenderAttribute:r.defender.attribute});
 const expectedDefender=rules.arena.CHARACTER_CATALOG[r.characterId]?rules.arena.persistentCharacterId(r.characterId):r.characterId;
 if(r.defender.actorId!==expectedDefender)throw Error('对抗检定回执与指定人物不一致');
 for(const side of [r,r.defender])if(!Number.isInteger(side.die)||side.die<1||side.die>20||!Number.isSafeInteger(side.modifier)||!Number.isSafeInteger(side.total)||(!Number.isInteger(side.bonus)||side.bonus>0||side.bonus< -4)||side.total!==side.die+side.modifier+side.bonus)throw Error('对抗检定回执与骰点不一致');
 if(typeof r.sourceId!=='string'||!r.sourceId||typeof r.actorId!=='string'||!r.actorId||r.passed!==(r.total>r.defender.total)||r.summary!==opposedSummary(r))throw Error('对抗检定回执与结果不一致');
}
